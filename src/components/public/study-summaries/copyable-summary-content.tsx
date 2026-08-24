"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Check, Copy } from "lucide-react";

type CodeBlockTarget = {
  pre: HTMLPreElement;
  wrapper: HTMLDivElement;
  root: Root;
};

function CodeCopyButton({ pre }: { pre: HTMLPreElement }) {
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    [],
  );

  const copyCode = async () => {
    const code = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
    if (!code.trim()) return;

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setCopied(false);
        resetTimerRef.current = null;
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      className="summary-code-block__copy-button"
      aria-label={copied ? "تم نسخ الكود" : "نسخ الكود"}
      title={copied ? "تم النسخ" : "نسخ الكود"}
      onClick={copyCode}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
    </button>
  );
}

export function CopyableSummaryContent({ html }: { html: string }) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const nextTargets: CodeBlockTarget[] = [];

    content.querySelectorAll<HTMLPreElement>("pre").forEach((pre) => {
      if (pre.closest(".summary-code-block")) return;

      const wrapper = document.createElement("div");
      const toolbar = document.createElement("div");
      const host = document.createElement("div");

      wrapper.className = "summary-code-block";
      toolbar.className = "summary-code-block__toolbar";
      host.className = "summary-code-block__copy-host";

      pre.replaceWith(wrapper);
      toolbar.appendChild(host);
      wrapper.append(toolbar, pre);

      const root = createRoot(host);
      root.render(<CodeCopyButton pre={pre} />);
      nextTargets.push({ pre, wrapper, root });
    });

    return () => {
      nextTargets.forEach(({ pre, wrapper, root }) => {
        root.unmount();
        if (wrapper.isConnected) wrapper.replaceWith(pre);
      });
    };
  }, [html]);

  return <div ref={contentRef} className="summary-content" dangerouslySetInnerHTML={{ __html: html }} />;
}
