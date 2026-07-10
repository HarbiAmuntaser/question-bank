export const DEGREE_TYPE_OPTIONS = [
  { value: "bachelor", label: "بكالوريوس" },
  { value: "diploma", label: "دبلوم" },
  { value: "other", label: "برامج أخرى" },
] as const;

export type DegreeTypeValue = (typeof DEGREE_TYPE_OPTIONS)[number]["value"];

const DEGREE_TYPE_LABELS: Record<DegreeTypeValue, string> = {
  bachelor: "بكالوريوس",
  diploma: "دبلوم",
  other: "برامج أخرى",
};

export function normalizeDegreeType(value: unknown): DegreeTypeValue {
  const raw = String(value ?? "").trim();
  const normalized = raw.toLowerCase();

  if (!normalized) return "other";
  if (normalized === "bachelor" || normalized.includes("bachelor") || normalized.includes("بكالور")) {
    return "bachelor";
  }
  if (normalized === "diploma" || normalized.includes("diploma") || normalized.includes("دبلوم")) {
    return "diploma";
  }
  if (normalized === "other") return "other";

  return "other";
}

export function getDegreeTypeLabel(value: unknown): string {
  return DEGREE_TYPE_LABELS[normalizeDegreeType(value)];
}
