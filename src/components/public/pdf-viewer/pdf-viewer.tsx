"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OnProgressParameters, PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import type { PDFViewer as PdfJsViewer } from "pdfjs-dist/web/pdf_viewer.mjs";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  Search,
  SearchX,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  pdfViewerLoadErrorMessage,
  pdfViewerSourceError,
  PdfViewerResponseError,
  type PdfViewerLoadStage,
} from "@/lib/public/pdf-viewer-errors";

type PdfViewerSource = {
  title: string;
  sourceUrl: string;
  sourceExpiresAt: string | null;
  watermark: {
    text: string;
    reference: string | null;
    traceable: boolean;
  };
};

type SourceResponse = {
  data?: PdfViewerSource;
  error?: string;
};

type PageChangingEvent = { pageNumber: number };
type ScaleChangingEvent = { scale: number };
type PageRenderedEvent = { pageNumber: number };
type FindMatchesEvent = { matchesCount?: { current?: number; total?: number } };

function paintWatermark(container: HTMLElement, pageNumber: number, source: PdfViewerSource) {
  const page = container.querySelector<HTMLElement>(`.page[data-page-number="${pageNumber}"]`);
  const renderedCanvas = page?.querySelector<HTMLCanvasElement>("canvas");
  if (!page || !renderedCanvas) return;

  page.style.position = "relative";
  let overlay = page.querySelector<HTMLCanvasElement>("canvas[data-mustawak-watermark]");
  if (!overlay) {
    overlay = document.createElement("canvas");
    overlay.dataset.mustawakWatermark = "true";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.zIndex = "5";
    overlay.style.pointerEvents = "none";
    page.appendChild(overlay);
  }

  const width = Math.max(1, renderedCanvas.clientWidth);
  const height = Math.max(1, renderedCanvas.clientHeight);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  overlay.width = Math.round(width * ratio);
  overlay.height = Math.round(height * ratio);
  overlay.style.width = `${width}px`;
  overlay.style.height = `${height}px`;

  const context = overlay.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, overlay.width, overlay.height);
  context.scale(ratio, ratio);
  context.translate(width / 2, height / 2);
  context.rotate(-Math.PI / 7);
  context.translate(-width / 2, -height / 2);
  context.font = `600 ${Math.max(12, Math.min(18, width / 34))}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = source.watermark.traceable
    ? "rgba(15, 118, 110, 0.14)"
    : "rgba(51, 65, 85, 0.08)";

  const horizontalStep = Math.max(230, width * 0.42);
  const verticalStep = Math.max(120, height * 0.18);
  for (let y = -height; y <= height * 2; y += verticalStep) {
    for (let x = -width; x <= width * 2; x += horizontalStep) {
      context.fillText(source.watermark.text, x, y);
    }
  }
}

export function ProtectedPdfViewer({
  sourceEndpoint,
  initialPage = 1,
}: {
  sourceEndpoint: string;
  initialPage?: number;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerElementRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PdfJsViewer | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const preservedPageRef = useRef(Math.max(1, initialPage));
  const preservedScaleRef = useRef("1");
  const [reloadKey, setReloadKey] = useState(0);
  const [title, setTitle] = useState("عارض مستواك");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(Math.max(1, initialPage));
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1);
  const [search, setSearch] = useState("");
  const [searchMatches, setSearchMatches] = useState({ current: 0, total: 0 });

  const retry = useCallback(() => {
    preservedPageRef.current = viewerRef.current?.currentPageNumber ?? preservedPageRef.current;
    preservedScaleRef.current = viewerRef.current?.currentScaleValue || "1";
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let disposed = false;
    let loadingStage: PdfViewerLoadStage = "source";
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let fullyDownloaded = false;
    const container = containerRef.current;
    const viewerElement = viewerElementRef.current;
    if (!container || !viewerElement) return;
    const viewerContainer: HTMLDivElement = container;
    const viewerNode: HTMLDivElement = viewerElement;

    setLoading(true);
    setError(null);
    setProgress(null);
    setSearchMatches({ current: 0, total: 0 });
    viewerElement.replaceChildren();

    async function load() {
      const response = await fetch(sourceEndpoint, {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => ({}))) as SourceResponse;
      if (!response.ok || !body.data) {
        throw new PdfViewerResponseError(pdfViewerSourceError(body.error, response.status));
      }
      const source = body.data;
      if (disposed) return;
      setTitle(source.title);

      loadingStage = "viewer";
      const pdfjs = await import("pdfjs-dist/webpack.mjs");
      if (disposed) return;
      const viewerModule = await import("pdfjs-dist/web/pdf_viewer.mjs");
      if (disposed) return;

      const eventBus = new viewerModule.EventBus();
      const linkService = new viewerModule.PDFLinkService({ eventBus });
      const findController = new viewerModule.PDFFindController({ eventBus, linkService });
      const viewer = new viewerModule.PDFViewer({
        container: viewerContainer,
        viewer: viewerNode,
        eventBus,
        linkService,
        findController,
        removePageBorders: false,
        maxCanvasPixels: 24 * 1024 * 1024,
        capCanvasAreaFactor: 160,
        enableDetailCanvas: true,
        enableSelectionRendering: true,
        imagesRightClickMinSize: -1,
      });
      viewerRef.current = viewer;
      linkService.setViewer(viewer);

      const onPageChanging = ({ pageNumber: nextPage }: PageChangingEvent) => {
        preservedPageRef.current = nextPage;
        setPageNumber(nextPage);
      };
      const onScaleChanging = ({ scale: nextScale }: ScaleChangingEvent) => {
        preservedScaleRef.current = viewer.currentScaleValue;
        setScale(nextScale);
      };
      const onPageRendered = ({ pageNumber: renderedPage }: PageRenderedEvent) => {
        paintWatermark(viewerContainer, renderedPage, source);
      };
      const onMatches = ({ matchesCount }: FindMatchesEvent) => {
        setSearchMatches({
          current: matchesCount?.current ?? 0,
          total: matchesCount?.total ?? 0,
        });
      };
      const onPagesInit = () => {
        const document = documentRef.current;
        if (!document) return;
        const requestedPage = Math.min(Math.max(1, preservedPageRef.current), document.numPages);
        viewer.currentScaleValue = preservedScaleRef.current || "1";
        viewer.currentPageNumber = requestedPage;
        setPageNumber(requestedPage);
        setScale(viewer.currentScale || 1);
        setLoading(false);
      };

      eventBus.on("pagechanging", onPageChanging);
      eventBus.on("scalechanging", onScaleChanging);
      eventBus.on("pagerendered", onPageRendered);
      eventBus.on("updatefindmatchescount", onMatches);
      eventBus.on("pagesinit", onPagesInit);

      loadingStage = "document";
      const loadingTask = pdfjs.getDocument({
        url: source.sourceUrl,
        rangeChunkSize: 128 * 1024,
        disableRange: false,
        disableStream: false,
        disableAutoFetch: false,
      });
      loadingTaskRef.current = loadingTask;
      loadingTask.onProgress = ({ loaded, total }: OnProgressParameters) => {
        if (!disposed && total > 0) setProgress(Math.min(100, Math.round((loaded / total) * 100)));
      };

      const pdfDocument = await loadingTask.promise;
      if (disposed) {
        await loadingTask.destroy();
        return;
      }
      documentRef.current = pdfDocument;
      setPageCount(pdfDocument.numPages);
      viewer.setDocument(pdfDocument);
      linkService.setDocument(pdfDocument);
      findController.setDocument(pdfDocument);

      pdfDocument.getDownloadInfo().then(() => {
        fullyDownloaded = true;
      }).catch(() => undefined);

      if (source.sourceExpiresAt) {
        const refreshIn = Math.max(5_000, Date.parse(source.sourceExpiresAt) - Date.now() - 45_000);
        refreshTimer = setTimeout(() => {
          if (!disposed && !fullyDownloaded) retry();
        }, refreshIn);
      }

      return () => {
        eventBus.off("pagechanging", onPageChanging);
        eventBus.off("scalechanging", onScaleChanging);
        eventBus.off("pagerendered", onPageRendered);
        eventBus.off("updatefindmatchescount", onMatches);
        eventBus.off("pagesinit", onPagesInit);
      };
    }

    let removeListeners: (() => void) | undefined;
    load()
      .then((cleanup) => {
        removeListeners = cleanup;
      })
      .catch((reason: unknown) => {
        if (disposed) return;
        setLoading(false);
        setError(pdfViewerLoadErrorMessage(reason, loadingStage));
      });

    return () => {
      disposed = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      removeListeners?.();
      viewerRef.current?.setDocument(null);
      viewerRef.current = null;
      documentRef.current = null;
      const task = loadingTaskRef.current;
      loadingTaskRef.current = null;
      if (task) void task.destroy();
      viewerElement.replaceChildren();
    };
  }, [reloadKey, retry, sourceEndpoint]);

  function changePage(nextPage: number) {
    const viewer = viewerRef.current;
    if (!viewer || !pageCount) return;
    viewer.currentPageNumber = Math.min(Math.max(1, nextPage), pageCount);
  }

  function changeZoom(factor: number) {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.currentScale = Math.min(3, Math.max(0.5, viewer.currentScale * factor));
  }

  function runSearch(findPrevious = false, again = false) {
    const query = search.trim();
    const viewer = viewerRef.current;
    if (!viewer || !query) return;
    viewer.eventBus.dispatch("find", {
      source: viewer,
      type: again ? "again" : "",
      query,
      phraseSearch: true,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious,
      matchDiacritics: false,
    });
  }

  return (
    <main className="pdf-protected-viewer flex h-dvh min-h-[420px] flex-col overflow-hidden bg-muted/40" dir="rtl">
      <header className="z-20 border-b bg-background/95 px-3 py-2 shadow-sm backdrop-blur sm:px-4">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2">
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => router.back()} title="رجوع">
              <ArrowRight className="h-5 w-5" aria-hidden />
              <span className="sr-only">رجوع</span>
            </Button>
            <h1 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">{title}</h1>
          </div>

          <div className="flex items-center gap-1" aria-label="التنقل بين الصفحات">
            <Button type="button" variant="outline" size="icon" disabled={loading || pageNumber <= 1} onClick={() => changePage(pageNumber - 1)} title="الصفحة السابقة">
              <ChevronRight className="h-4 w-4" aria-hidden />
              <span className="sr-only">الصفحة السابقة</span>
            </Button>
            <label className="flex h-9 items-center gap-1 rounded-md border bg-background px-2 text-xs">
              <span className="sr-only">رقم الصفحة</span>
              <input
                className="w-10 bg-transparent text-center outline-none arabic-numbers"
                inputMode="numeric"
                value={pageNumber}
                onChange={(event) => setPageNumber(Number.parseInt(event.target.value, 10) || 1)}
                onBlur={() => changePage(pageNumber)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") changePage(pageNumber);
                }}
                aria-label="رقم الصفحة"
              />
              <span className="text-muted-foreground">/ {pageCount || "-"}</span>
            </label>
            <Button type="button" variant="outline" size="icon" disabled={loading || !pageCount || pageNumber >= pageCount} onClick={() => changePage(pageNumber + 1)} title="الصفحة التالية">
              <ChevronLeft className="h-4 w-4" aria-hidden />
              <span className="sr-only">الصفحة التالية</span>
            </Button>
          </div>

          <div className="flex items-center gap-1" aria-label="تكبير الملف">
            <Button type="button" variant="outline" size="icon" disabled={loading || scale <= 0.5} onClick={() => changeZoom(0.9)} title="تصغير">
              <ZoomOut className="h-4 w-4" aria-hidden />
              <span className="sr-only">تصغير</span>
            </Button>
            <span className="w-12 text-center text-xs tabular-nums">{Math.round(scale * 100)}%</span>
            <Button type="button" variant="outline" size="icon" disabled={loading || scale >= 3} onClick={() => changeZoom(1.1)} title="تكبير">
              <ZoomIn className="h-4 w-4" aria-hidden />
              <span className="sr-only">تكبير</span>
            </Button>
          </div>

          <form
            className="order-last flex w-full items-center gap-1 sm:order-none sm:w-auto"
            onSubmit={(event) => {
              event.preventDefault();
              runSearch(false, searchMatches.total > 0);
            }}
          >
            <div className="relative min-w-0 flex-1 sm:w-56">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 pr-8" placeholder="بحث داخل الملف" aria-label="بحث داخل الملف" />
            </div>
            <Button type="submit" variant="outline" size="sm" disabled={!search.trim() || loading}>بحث</Button>
            {searchMatches.total > 0 ? (
              <span className="min-w-14 text-center text-xs text-muted-foreground" aria-live="polite">
                {searchMatches.current}/{searchMatches.total}
              </span>
            ) : null}
          </form>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="pdf-viewer-scroll absolute inset-0 overflow-auto" tabIndex={0} aria-label="محتوى ملف PDF">
          <div ref={viewerElementRef} className="pdfViewer" />
        </div>

        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/85">
            <div className="text-center">
              <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-primary" aria-hidden />
              <p className="mt-3 text-sm font-medium">جاري تجهيز الملف</p>
              {progress !== null ? <p className="mt-1 text-xs text-muted-foreground">{progress}%</p> : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background p-6">
            <div className="max-w-md text-center">
              <SearchX className="mx-auto h-9 w-9 text-muted-foreground" aria-hidden />
              <p className="mt-4 font-semibold">{error}</p>
              <Button type="button" className="mt-5 gap-2" onClick={retry}>
                <RefreshCw className="h-4 w-4" aria-hidden />
                إعادة المحاولة
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="pdf-print-message hidden" aria-hidden>
        الطباعة غير متاحة من عارض مستواك.
      </div>
    </main>
  );
}
