import type { Metadata } from "next";
import type { ReactNode } from "react";

import "pdfjs-dist/web/pdf_viewer.css";
import "./pdf-viewer.css";

export const metadata: Metadata = {
  title: "عارض الملفات",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function PdfViewerLayout({ children }: { children: ReactNode }) {
  return children;
}
