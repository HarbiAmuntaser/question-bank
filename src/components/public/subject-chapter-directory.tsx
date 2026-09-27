"use client";

import Link from "next/link";
import { ClipboardCheck, FileText, Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groupChaptersByKind } from "@/lib/chapter-kind-groups";
import type { SubjectChapterCard } from "@/components/public/subject-chapters";

function ChapterCards({ chapters }: { chapters: SubjectChapterCard[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {chapters.map((chapter) => (
        <Card key={chapter.id} className="flex h-full flex-col border bg-card/95 shadow-sm transition-colors hover:border-primary/40">
          <CardHeader className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                {chapter.chapterNumber ? (
                  <Badge variant="secondary" className="arabic-numbers">الفصل {chapter.chapterNumber}</Badge>
                ) : null}
                <h3 className="text-lg font-bold leading-7 sm:text-xl">{chapter.name}</h3>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Layers3 className="h-5 w-5" aria-hidden />
              </span>
            </div>
            {chapter.description ? <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{chapter.description}</p> : null}
          </CardHeader>
          <CardContent className="mt-auto flex flex-col gap-4 px-5 pb-5 pt-0">
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-foreground/75">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" aria-hidden />
                <span className="arabic-numbers">{chapter.summariesCount}</span> ملخصات
              </span>
              <span className="flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden />
                <span className="arabic-numbers">{chapter.quizzesCount}</span> اختبارات
              </span>
            </div>
            <Button asChild className="h-11 w-full rounded-lg sm:w-auto sm:self-start">
              <Link href={chapter.href} prefetch={false}>تفاصيل الفصل</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SubjectChapterKindDirectory({ chapters }: { chapters: SubjectChapterCard[] }) {
  const groups = groupChaptersByKind(chapters);

  if (!groups.practical.length) return <ChapterCards chapters={chapters} />;

  if (!groups.theory.length) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">المحتوى العملي</h2>
        <ChapterCards chapters={groups.practical} />
      </div>
    );
  }

  return (
    <Tabs defaultValue="theory" className="space-y-5" dir="rtl">
      <TabsList className="grid h-11 w-full grid-cols-2 sm:max-w-sm">
        <TabsTrigger value="theory">النظري</TabsTrigger>
        <TabsTrigger value="practical">العملي</TabsTrigger>
      </TabsList>
      <TabsContent value="theory" className="mt-0"><ChapterCards chapters={groups.theory} /></TabsContent>
      <TabsContent value="practical" className="mt-0"><ChapterCards chapters={groups.practical} /></TabsContent>
    </Tabs>
  );
}
