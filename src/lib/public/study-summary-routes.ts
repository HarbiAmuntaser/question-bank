export type StudySummaryLanguage = "ar" | "en";

export function summaryLanguageFromQuery(value: string | undefined): StudySummaryLanguage {
  return value === "en" ? "en" : "ar";
}

export function summaryQuery(language: StudySummaryLanguage, reviewTopic?: string | null): string {
  const params = new URLSearchParams();
  if (language === "en") params.set("lang", "en");
  if (reviewTopic) params.set("reviewTopic", reviewTopic);
  const query = params.toString();
  return query ? `?${query}` : "";
}
