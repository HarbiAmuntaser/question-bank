import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TTL } from "@/lib/cache-tags";
import { publicQuizWhere } from "@/lib/server/public-content-visibility";

export const dynamic = "force-dynamic";

function intOrDefault(v: string | null, def: number) {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const universityId = searchParams.get("universityId") || undefined;
    const majorId      = searchParams.get("majorId") || undefined;
    const degreeType   = searchParams.get("degreeType") || undefined;
    const subjectId    = searchParams.get("subjectId") || undefined;
    const searchTerm   = searchParams.get("searchTerm") || undefined;

    const page        = intOrDefault(searchParams.get("page"), 1);
    const pageSizeRaw = intOrDefault(searchParams.get("pageSize"), 12);
    const pageSize    = Math.min(Math.max(pageSizeRaw, 1), 50);
    const skip        = (page - 1) * pageSize;

    // نجمع شروط الأبعاد على شكل AND، وكل بُعد يضم OR بين المسارين (مباشر/غير مباشر).
    const dimAND: any[] = [];

    if (subjectId) {
      dimAND.push({
        OR: [
          { subjectId }, // مباشر
          { questions: { some: { question: { chapter: { subjectId } } } } }, // عبر الأسئلة
        ],
      });
    }

    if (majorId) {
      dimAND.push({
        OR: [
          { subject: { majorId } },
          { questions: { some: { question: { chapter: { subject: { majorId } } } } } },
        ],
      });
    }

    if (universityId) {
      dimAND.push({
        OR: [
          { subject: { major: { universityId } } },
          { questions: { some: { question: { chapter: { subject: { major: { universityId } } } } } } },
        ],
      });
    }

    if (degreeType) {
      dimAND.push({
        OR: [
          { subject: { major: { degreeType } } },
          { questions: { some: { question: { chapter: { subject: { major: { degreeType } } } } } } },
        ],
      });
    }

    // البحث النصّي: OR كبير (ونُدخله داخل AND كي يتقاطع مع بقية الأبعاد)
    const searchOR: any[] = [];
    if (searchTerm) {
      searchOR.push(
        { title: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        // مباشر عبر subject
        { subject: { name: { contains: searchTerm, mode: "insensitive" } } },
        { subject: { major: { name: { contains: searchTerm, mode: "insensitive" } } } },
        { subject: { major: { university: { name: { contains: searchTerm, mode: "insensitive" } } } } },
        // عبر الأسئلة
        { questions: { some: { question: { chapter: { subject: { name: { contains: searchTerm, mode: "insensitive" } } } } } } },
        { questions: { some: { question: { chapter: { subject: { major: { name: { contains: searchTerm, mode: "insensitive" } } } } } } } },
        { questions: { some: { question: { chapter: { subject: { major: { university: { name: { contains: searchTerm, mode: "insensitive" } } } } } } } } },
      );
      dimAND.push({ OR: searchOR });
    }

    const where: any = { isActive: true, ...publicQuizWhere() };
    if (dimAND.length) where.AND = dimAND;

    const [items, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        take: pageSize,
        skip,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          timeLimit: true,
          createdAt: true,
          accessType: true,
          isFreePreview: true,
          _count: { select: { questions: true } },
          // المسار المباشر
          subject: {
            select: {
              id: true,
              name: true,
              majorId: true,
              major: {
                select: {
                  id: true,
                  name: true,
                  degreeType: true,
                  universityId: true,
                  university: { select: { id: true, name: true } },
                },
              },
            },
          },
          // مسار الأسئلة — نأخذ سؤالاً واحداً كمرجع
          questions: {
            take: 1,
            select: {
              question: {
                select: {
                  chapter: {
                    select: {
                      subject: {
                        select: {
                          id: true,
                          name: true,
                          majorId: true,
                          major: {
                            select: {
                              id: true,
                              name: true,
                              degreeType: true,
                              universityId: true,
                              university: { select: { id: true, name: true } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.quiz.count({ where }),
    ]);

    const data = items.map((q) => {
      const subjectViaQuiz = q.subject ?? null;
      const subjectViaQuestion = q.questions?.[0]?.question?.chapter?.subject ?? null;

      const effectiveSubject = subjectViaQuiz || subjectViaQuestion || null;
      const effectiveMajor = effectiveSubject?.major || null;
      const effectiveUniversity = effectiveMajor?.university || null;

      return {
        id: q.id,
        title: q.title,
        description: q.description,
        timeLimit: q.timeLimit,
        createdAt: q.createdAt,
        accessType: q.accessType,
        isFreePreview: q.isFreePreview,
        _count: q._count,
        university: effectiveUniversity ? { id: effectiveUniversity.id, name: effectiveUniversity.name } : null,
        major: effectiveMajor
          ? { id: effectiveMajor.id, name: effectiveMajor.name, degreeType: effectiveMajor.degreeType, universityId: effectiveMajor.universityId }
          : null,
        subject: effectiveSubject
          ? { id: effectiveSubject.id, name: effectiveSubject.name, majorId: effectiveSubject.majorId }
          : null,
        chapter: null,
      };
    });

    const headers = new Headers({
      "cache-control": CACHE_CONTROL.publicSMaxage(CACHE_TTL.publicStable),
    });

    return json(
      {
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      { status: 200, headers }
    );
  } catch {
    return bad("failed_to_load_quizzes", 500);
  }
}
