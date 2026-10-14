"use client";

import type { ReactNode } from "react";
import { BookOpenText, ClipboardCheck } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ChapterContentTabs({
  tests,
  summaries,
  hasTests,
  hasSummaries,
}: {
  tests: ReactNode;
  summaries: ReactNode;
  hasTests: boolean;
  hasSummaries: boolean;
}) {
  if (!hasTests) return <>{summaries}</>;
  if (!hasSummaries) return <>{tests}</>;

  return (
    <Tabs defaultValue="tests" dir="rtl" className="space-y-6">
      <TabsList className="grid h-12 w-full grid-cols-2 sm:mx-auto sm:max-w-md" aria-label="محتوى الفصل">
        <TabsTrigger value="tests" className="h-10 gap-2">
          <ClipboardCheck className="h-4 w-4" aria-hidden />
          الاختبارات
        </TabsTrigger>
        <TabsTrigger value="summaries" className="h-10 gap-2">
          <BookOpenText className="h-4 w-4" aria-hidden />
          الملخصات
        </TabsTrigger>
      </TabsList>
      <TabsContent value="tests" className="space-y-8">{tests}</TabsContent>
      <TabsContent value="summaries">{summaries}</TabsContent>
    </Tabs>
  );
}
