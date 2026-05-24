// src/components/public/quiz/review/text-direction.ts

/**
 * كشف اتجاه النص بشكل بسيط:
 * - إذا كانت نسبة أحرف عربية/RTL واضحة → rtl
 * - غير ذلك → ltr
 */
export function detectDir(text: string): "rtl" | "ltr" {
  const s = (text || "").trim();
  if (!s) return "rtl";

  // Arabic + RTL ranges
  const rtl = s.match(/[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/g)?.length ?? 0;
  const total = Math.min(s.length, 200); // لا نبالغ في العد
  const ratio = total ? rtl / total : 0;

  return ratio >= 0.12 ? "rtl" : "ltr";
}

export function dirTextAlign(dir: "rtl" | "ltr") {
  return dir === "rtl" ? "text-right" : "text-left";
}
