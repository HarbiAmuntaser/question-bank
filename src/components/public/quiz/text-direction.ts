// src/components/public/quiz/text-direction.ts
/**
 * اكتشاف اتجاه النص (RTL/LTR) ولغة تقريبية (ar/en)
 * - يعتمد على أول "حرف قوي" يظهر في النص
 * - مناسب لمعظم أسئلة العربية/الإنجليزية
 */

export type TextDir = "rtl" | "ltr";
export type TextLang = "ar" | "en";

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_RE = /[A-Za-z]/;

export function detectTextDir(text: string | null | undefined): TextDir {
  const t = (text ?? "").trim();
  if (!t) return "rtl"; // افتراضيًا عربي

  for (const ch of t) {
    if (ARABIC_RE.test(ch)) return "rtl";
    if (LATIN_RE.test(ch)) return "ltr";
  }

  // لو النص أرقام/رموز فقط
  return "rtl";
}

export function detectTextLang(text: string | null | undefined): TextLang {
  const dir = detectTextDir(text);
  return dir === "rtl" ? "ar" : "en";
}
