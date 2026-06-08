import { detectTextLang, type TextLang } from "./text-direction";

export function getQuestionLang(questionText: string | null | undefined): TextLang {
  return detectTextLang(questionText);
}

export function questionNumberLabel(questionNumber: number, lang: TextLang) {
  return lang === "en" ? `Question ${questionNumber}` : `السؤال ${questionNumber}`;
}

export function pointsLabel(points: number, lang: TextLang) {
  return lang === "en" ? `${points} pts` : `${points} نقطة`;
}

export function trueFalseLabel(value: boolean, lang: TextLang) {
  if (lang === "en") return value ? "True" : "False";
  return value ? "صحيح" : "خطأ";
}

export function optionToBoolean(optionText: string | null | undefined) {
  const value = String(optionText ?? "").trim().toLowerCase();
  if (["true", "t", "صح", "صحيح", "صواب"].includes(value)) return true;
  if (["false", "f", "خطأ", "خطا", "خطاء", "غير صحيح", "غلط"].includes(value)) return false;
  return null;
}
