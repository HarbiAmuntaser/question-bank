import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type RichBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "code";
      code: string;
      language?: string;
    };

type RichQuestionContentProps = {
  content?: string | null;
  className?: string;
  textClassName?: string;
  codeClassName?: string;
};

const codeFencePattern = /```([a-zA-Z0-9_-]+)?[ \t]*\n?([\s\S]*?)```/g;
const inlinePattern = /(`[^`\n]+`|\$\$[^$\n]+\$\$|\$[^$\n]+\$)/g;

function pushTextBlocks(blocks: RichBlock[], text: string) {
  text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => blocks.push({ type: "paragraph", text: part }));
}

function parseBlocks(content: string) {
  const blocks: RichBlock[] = [];
  const normalized = content.replace(/\r\n?/g, "\n");
  let cursor = 0;
  let match: RegExpExecArray | null;

  codeFencePattern.lastIndex = 0;
  while ((match = codeFencePattern.exec(normalized)) !== null) {
    pushTextBlocks(blocks, normalized.slice(cursor, match.index));
    blocks.push({
      type: "code",
      language: match[1],
      code: match[2].replace(/\n$/, ""),
    });
    cursor = match.index + match[0].length;
  }

  pushTextBlocks(blocks, normalized.slice(cursor));
  return blocks;
}

function renderInline(text: string) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  inlinePattern.lastIndex = 0;
  while ((match = inlinePattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));

    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`code-${match.index}`}
          dir="ltr"
          className="mx-0.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[0.92em] text-foreground"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const isBlockMath = token.startsWith("$$");
      // Lightweight math display: preserve notation without adding a heavy renderer.
      nodes.push(
        <span
          key={`math-${match.index}`}
          dir="ltr"
          className={cn(
            "mx-0.5 rounded bg-muted/70 px-1.5 py-0.5 font-mono text-[0.92em] text-foreground",
            isBlockMath && "inline-block",
          )}
        >
          {token.slice(isBlockMath ? 2 : 1, isBlockMath ? -2 : -1)}
        </span>,
      );
    }

    cursor = match.index + token.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function RichQuestionContent({
  content,
  className,
  textClassName,
  codeClassName,
}: RichQuestionContentProps) {
  const blocks = parseBlocks(content ?? "");

  if (!blocks.length) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <div
              key={`code-${index}`}
              dir="ltr"
              className={cn(
                "overflow-hidden rounded-lg border bg-zinc-950 text-left text-zinc-50 shadow-sm",
                codeClassName,
              )}
            >
              {block.language ? (
                <div className="border-b border-white/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-zinc-400">
                  {block.language}
                </div>
              ) : null}
              <pre className="overflow-x-auto p-3 text-xs leading-6 sm:text-sm">
                <code>{block.code}</code>
              </pre>
            </div>
          );
        }

        return (
          <p key={`paragraph-${index}`} className={cn("whitespace-pre-wrap break-words leading-relaxed", textClassName)}>
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
