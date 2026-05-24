// src/components/admin/questions/questions-table.tsx
import { headers as nextHeaders } from "next/headers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HelpCircle, CheckCircle, FileText, PenTool } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { SortButton } from "@/components/ui/SortButton";
import { QuestionsFilters } from "./QuestionsFilters";
import { QuestionActions } from "./question-actions";

type QuestionRow = {
  id: string;
  chapterId: string;
  questionText: string;
  questionType: "multiple_choice" | "true_false" | "short_answer" | "essay";
  difficultyLevel: "easy" | "medium" | "hard";
  points: number;
  isActive: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  chapter: {
    id: string;
    name: string;
    chapterNumber: number | null;
    subject: {
      id: string;
      name: string;
      code: string | null;
      major: {
        id: string;
        name: string;
        code: string | null;
        university: { id: string; name: string; code: string | null };
      };
    };
  };
};

interface PaginationMeta { page: number; pageSize: number; total: number; totalPages: number }
interface ListResponse { data: QuestionRow[]; pagination: PaginationMeta }

function buildQuery(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) usp.set(k, String(v)); });
  return usp.toString();
}

async function getApiBase(): Promise<string> {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (envBase && envBase.length > 0) return envBase;
  const h = await nextHeaders();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchQuestions(args: {
  page: number;
  pageSize: number;
  sortBy: "createdAt" | "questionText" | "points" | "difficultyLevel";
  sortOrder: "asc" | "desc";
  universityId?: string;
  majorId?: string;
  subjectId?: string;
  chapterId?: string;
}): Promise<ListResponse> {
  const qs = buildQuery(args);
  const base = await getApiBase();
  const res = await fetch(`${base}/api/v1/admin/questions?${qs}`, {
    next: { revalidate: 3600, tags: ["questions"] },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || "فشل تحميل الأسئلة");
  }
  return (await res.json()) as ListResponse;
}

const questionTypeIcons = {
  multiple_choice: HelpCircle,
  true_false: CheckCircle,
  short_answer: PenTool,
  essay: FileText,
};
const questionTypeLabels = {
  multiple_choice: "اختيار متعدد",
  true_false: "صح/خطأ",
  short_answer: "إجابة قصيرة",
  essay: "مقال",
};
const difficultyColors: Record<QuestionRow["difficultyLevel"], string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-red-100 text-red-800",
};
const difficultyLabels: Record<QuestionRow["difficultyLevel"], string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
};

export async function QuestionsTable({
  searchParams,
}: {
  searchParams?: {
    page?: string;
    sortBy?: string;
    sortOrder?: string;
    universityId?: string;
    majorId?: string;
    subjectId?: string;
    chapterId?: string;
  };
}) {
  // ✅ الآن هذه قيم عادية وليست dynamic API
  const currentPage = Number(searchParams?.page ?? 1) || 1;
  const perPage = 10;

  const sortBy: "createdAt" | "questionText" | "points" | "difficultyLevel" = (() => {
    const s = searchParams?.sortBy;
    return s === "questionText" || s === "points" || s === "difficultyLevel" ? (s as any) : "createdAt";
  })();
  const sortOrder: "asc" | "desc" = searchParams?.sortOrder === "asc" ? "asc" : "desc";

  const args = {
    page: currentPage,
    pageSize: perPage,
    sortBy,
    sortOrder,
    universityId: searchParams?.universityId || undefined,
    majorId: searchParams?.majorId || undefined,
    subjectId: searchParams?.subjectId || undefined,
    chapterId: searchParams?.chapterId || undefined,
  };

  const { data: questions, pagination } = await fetchQuestions(args);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <QuestionsFilters />
        <div className="flex gap-2">
          <SortButton sortBy="questionText" currentSort={sortBy} sortOrder={sortOrder}>السؤال</SortButton>
          <SortButton sortBy="points" currentSort={sortBy} sortOrder={sortOrder}>النقاط</SortButton>
          {/* <SortButton sortBy="difficultyLevel" currentSort={sortBy} sortOrder={sortOrder}>الصعوبة</SortButton> */}
          <SortButton sortBy="createdAt" currentSort={sortBy} sortOrder={sortOrder}>الأحدث</SortButton>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>السؤال</TableHead>
              <TableHead>الفصل</TableHead>
              <TableHead>المقرر</TableHead>
              <TableHead>التخصص</TableHead>
              <TableHead>الجامعة</TableHead>
              <TableHead>نوع</TableHead>
              <TableHead>الصعوبة</TableHead>
              <TableHead>النقاط</TableHead>
              <TableHead>العلامات</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((q) => {
              const TypeIcon = questionTypeIcons[q.questionType];
              return (
                <TableRow key={q.id}>
                  <TableCell>
                    <div className="flex items-start space-x-3 space-x-reverse">
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className="bg-indigo-100 text-indigo-600">
                          <TypeIcon className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm line-clamp-2">{q.questionText}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{q.chapter.name}</div>
                    <div className="text-xs text-muted-foreground">
                      الفصل {q.chapter.chapterNumber ?? "غير محدد"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{q.chapter.subject.name}</div>
                    <div className="text-xs text-muted-foreground">{q.chapter.subject.code ?? ""}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{q.chapter.subject.major.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{q.chapter.subject.major.university.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <TypeIcon className="h-3 w-3" />
                      {questionTypeLabels[q.questionType]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={difficultyColors[q.difficultyLevel]}>
                      {difficultyLabels[q.difficultyLevel]}
                    </Badge>
                  </TableCell>
                  <TableCell><div className="text-sm arabic-numbers font-medium">{q.points}</div></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {q.tags.slice(0, 2).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                      {q.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">+{q.tags.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={q.isActive ? "default" : "secondary"}>
                      {q.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground arabic-numbers">
                      {new Date(q.createdAt).toLocaleDateString("ar-SA")}
                    </div>
                  </TableCell>
                  <TableCell className="text-left">
                    <QuestionActions question={q} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={pagination.pageSize}
      />
    </div>
  );
}
