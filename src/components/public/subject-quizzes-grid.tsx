// file: src/components/public/subject-quizzes-grid.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, BookOpen } from "lucide-react";

type QuizLite = {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  _count: { questions: number };
  chapter?: { id: string; name: string } | null;
};

export function SubjectQuizzesGrid({ quizzes }: { quizzes: QuizLite[] }) {
  if (!quizzes?.length) {
    return (
      <div className="text-center text-muted-foreground py-10">
        لا توجد اختبارات لهذه المادة بعد.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {quizzes.map((q) => (
        <Card key={q.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg line-clamp-2">{q.title}</CardTitle>
            {q.chapter?.name ? (
              <p className="text-xs text-muted-foreground mt-1">الفصل: {q.chapter.name}</p>
            ) : null}
          </CardHeader>

          <CardContent className="pt-0 space-y-4">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {q.description || "لا يوجد وصف مختصر لهذا الاختبار."}
            </p>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" /> {q._count?.questions ?? 0} أسئلة
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {q.timeLimit} دقيقة
              </span>
            </div>

            <Button asChild className="w-full">
              <Link href={`/quiz/${q.id}`} className="flex items-center justify-center gap-2">
                <Trophy className="h-4 w-4" aria-hidden />
                ابدأ الاختبار
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
