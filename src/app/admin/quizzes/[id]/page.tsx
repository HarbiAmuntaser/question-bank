import { notFound } from "next/navigation";
import { fetchQuizById } from "@/app/admin/quizzes/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import EditQuizForm from "@/components/admin/quizzes/EditQuizForm";

export default async function QuizDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await fetchQuizById(id);
  if (!r.success || !r.quiz) return notFound();

  const quiz = r.quiz as any;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{quiz.title}</CardTitle>
          <CardDescription>
            أسئلة: {quiz.totalQuestions} • الوقت: {quiz.timeLimit} دقيقة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <EditQuizForm quiz={quiz} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الأسئلة</CardTitle>
          <CardDescription>قائمة الأسئلة ضمن هذا الاختبار</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {quiz.questions.length === 0 ? (
            <div className="text-muted-foreground">لا توجد أسئلة</div>
          ) : (
            <ul className="space-y-3">
              {quiz.questions.map((q: any) => (
                <li key={q.id} className="p-3 border rounded-lg">
                  <div className="font-medium">{q.question.questionText}</div>
                  <div className="text-sm text-muted-foreground">
                    {q.question.chapter.name} — {q.question.chapter.subject.name}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
