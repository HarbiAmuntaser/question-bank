import type { CountryCode } from "@/config/regions";

export const MAX_ACADEMIC_YEARS = 6;
export const SEMESTERS_PER_ACADEMIC_YEAR = 2;

export type AcademicPeriod = {
  year: number;
  semester: number;
};

const masculineOrdinals = [
  "الأول",
  "الثاني",
  "الثالث",
  "الرابع",
  "الخامس",
  "السادس",
  "السابع",
  "الثامن",
  "التاسع",
  "العاشر",
  "الحادي عشر",
  "الثاني عشر",
] as const;

const feminineOrdinals = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة"] as const;

export function isValidAcademicPeriod(value: {
  year?: number | null;
  semester?: number | null;
}): value is AcademicPeriod {
  return (
    Number.isInteger(value.year) &&
    Number.isInteger(value.semester) &&
    (value.year as number) >= 1 &&
    (value.year as number) <= MAX_ACADEMIC_YEARS &&
    (value.semester as number) >= 1 &&
    (value.semester as number) <= SEMESTERS_PER_ACADEMIC_YEAR
  );
}

export function getAcademicLevelNumber(period: AcademicPeriod) {
  return (period.year - 1) * SEMESTERS_PER_ACADEMIC_YEAR + period.semester;
}

export function getAcademicPeriodRouteKey(period: AcademicPeriod) {
  return `${period.year}-${period.semester}`;
}

export function parseAcademicPeriodRouteKey(routeKey: string): AcademicPeriod | null {
  const match = /^(\d+)-(\d+)$/.exec(routeKey.trim());
  if (!match) return null;

  const period = {
    year: Number.parseInt(match[1], 10),
    semester: Number.parseInt(match[2], 10),
  };

  return isValidAcademicPeriod(period) ? period : null;
}

export function compareAcademicPeriods(a: AcademicPeriod, b: AcademicPeriod) {
  return a.year - b.year || a.semester - b.semester;
}

export function getAcademicPeriodLabel(countryCode: CountryCode | string, period: AcademicPeriod) {
  if (countryCode.toUpperCase() === "YE") {
    const yearLabel = feminineOrdinals[period.year - 1] ?? String(period.year);
    const semesterLabel = masculineOrdinals[period.semester - 1] ?? String(period.semester);
    return `السنة ${yearLabel} - الفصل الدراسي ${semesterLabel}`;
  }

  const level = getAcademicLevelNumber(period);
  const levelLabel = masculineOrdinals[level - 1] ?? String(level);
  return `المستوى ${levelLabel}`;
}
