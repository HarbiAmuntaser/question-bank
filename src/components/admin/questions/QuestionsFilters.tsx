"use client";

import { AdminContentPathFilters } from "@/components/admin/admin-content-path-filters";

export function QuestionsFilters() {
  return <AdminContentPathFilters through="chapter" />;
}
