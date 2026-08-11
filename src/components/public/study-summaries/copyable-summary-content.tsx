"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy } from "lucide-react";

type CodeBlockTarget = {
  id: number;
  host: HTMLDivElement;
  pre: HTMLPreElement;
  wrapper: HTMLDivElement;
};

export function CopyableSummaryContent({ html }: { html: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [targets, setTargets] = useState<CodeBlockTarget[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const nextTargets: CodeBlockTarget[] = [];

    content.querySelectorAll<HTMLPreElement>("pre").forEach((pre, id) => {
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

      nextTargets.push({ id, host, pre, wrapper });
    });

    setTargets(nextTargets);

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      nextTargets.forEach(({ pre, wrapper }) => {
        if (wrapper.isConnected) wrapper.replaceWith(pre);
      });
    };
  }, [html]);

  const copyCode = async (target: CodeBlockTarget) => {
    const code = target.pre.querySelector("code")?.textContent ?? target.pre.textContent ?? "";
    if (!code.trim()) return;

    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(target.id);

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setCopiedId(null);
        resetTimerRef.current = null;
      }, 1800);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <>
      <div ref={contentRef} className="summary-content" dangerouslySetInnerHTML={{ __html: html }} />
      {targets.map((target) =>
        createPortal(
          <button
            key={target.id}
            type="button"
            className="summary-code-block__copy-button"
            aria-label={copiedId === target.id ? "تم نسخ الكود" : "نسخ الكود"}
            title={copiedId === target.id ? "تم النسخ" : "نسخ الكود"}
            onClick={() => copyCode(target)}
          >
            {copiedId === target.id ? <Check aria-hidden /> : <Copy aria-hidden />}
          </button>,
          target.host,
          target.id,
        ),
      )}
    </>
  );
}
