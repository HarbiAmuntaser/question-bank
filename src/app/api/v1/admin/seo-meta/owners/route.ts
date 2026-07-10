// src/app/api/v1/admin/seo-meta/owners/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type OwnerType = "university" | "major" | "subject" | "chapter" | "exam" | "blog_post" | "blog_topic" | "study_summary";

function pick(v: string | null) {
  const t = (v ?? "").trim();
  return t.length ? t : null;
}

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const url = new URL(req.url);
  const type = pick(url.searchParams.get("type")) as OwnerType | null;
  const query = pick(url.searchParams.get("query")) ?? "";
  const take = Math.min(Math.max(Number(url.searchParams.get("take") ?? "20") || 20, 5), 50);

  const mode = pick(url.searchParams.get("mode")); // "resolve" | null
  const id = pick(url.searchParams.get("id"));

  const universityId = pick(url.searchParams.get("universityId"));
  const majorId = pick(url.searchParams.get("majorId"));
  const subjectId = pick(url.searchParams.get("subjectId"));

  if (!type) return bad("missing_type", 400);

  // -----------------------
  // ✅ Resolve (لتعبئة السلسلة عند التعديل)
  // -----------------------
  if (mode === "resolve") {
    if (!id) return bad("missing_id", 400);

    if (type === "university") {
      const u = await prisma.university.findUnique({
        where: { id },
        select: { id: true, name: true, code: true, countryCode: true },
      });
      if (!u) return bad("not_found", 404);
      return json({
        data: {
          ownerType: type,
          chain: {
            university: { id: u.id, label: u.name, subLabel: `${u.countryCode}${u.code ? ` • ${u.code}` : ""}` },
          },
        },
      });
    }

    if (type === "major") {
      const m = await prisma.major.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true, countryCode: true } },
        },
      });
      if (!m) return bad("not_found", 404);
      return json({
        data: {
          ownerType: type,
          chain: {
            university: m.university
              ? {
                  id: m.university.id,
                  label: m.university.name,
                  subLabel: `${m.university.countryCode}${m.university.code ? ` • ${m.university.code}` : ""}`,
                }
              : null,
            major: { id: m.id, label: m.name, subLabel: m.code ? `• ${m.code}` : "" },
          },
        },
      });
    }

    if (type === "subject") {
      const s = await prisma.subject.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          code: true,
          major: {
            select: {
              id: true,
              name: true,
              code: true,
              university: { select: { id: true, name: true, code: true, countryCode: true } },
            },
          },
        },
      });
      if (!s) return bad("not_found", 404);
      return json({
        data: {
          ownerType: type,
          chain: {
            university: s.major?.university
              ? {
                  id: s.major.university.id,
                  label: s.major.university.name,
                  subLabel: `${s.major.university.countryCode}${s.major.university.code ? ` • ${s.major.university.code}` : ""}`,
                }
              : null,
            major: s.major ? { id: s.major.id, label: s.major.name, subLabel: s.major.code ? `• ${s.major.code}` : "" } : null,
            subject: { id: s.id, label: s.name, subLabel: s.code ? `• ${s.code}` : "" },
          },
        },
      });
    }

    if (type === "chapter") {
      const c = await prisma.chapter.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          chapterNumber: true,
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              major: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  university: { select: { id: true, name: true, code: true, countryCode: true } },
                },
              },
            },
          },
        },
      });
      if (!c) return bad("not_found", 404);

      const u = c.subject?.major?.university;
      const m = c.subject?.major;

      return json({
        data: {
          ownerType: type,
          chain: {
            university: u ? { id: u.id, label: u.name, subLabel: `${u.countryCode}${u.code ? ` • ${u.code}` : ""}` } : null,
            major: m ? { id: m.id, label: m.name, subLabel: m.code ? `• ${m.code}` : "" } : null,
            subject: c.subject ? { id: c.subject.id, label: c.subject.name, subLabel: c.subject.code ? `• ${c.subject.code}` : "" } : null,
            chapter: { id: c.id, label: c.chapterNumber ? `الوحدة ${c.chapterNumber}: ${c.name}` : c.name },
          },
        },
      });
    }

  // ✅ exam => Quiz
    if (type === "exam") {
      const q = await prisma.quiz.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          createdAt: true,
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              major: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  university: { select: { id: true, name: true, code: true, countryCode: true } },
                },
              },
            },
          },
        },
      });

      if (!q) return bad("not_found", undefined, 404);

      const u = q.subject?.major?.university;
      const m = q.subject?.major;

      return json({
        data: {
          ownerType: type,
          chain: {
            university: u
              ? { id: u.id, label: u.name, subLabel: `${u.countryCode}${u.code ? ` • ${u.code}` : ""}` }
              : null,
            major: m ? { id: m.id, label: m.name, subLabel: m.code ? `• ${m.code}` : "" } : null,
            subject: q.subject ? { id: q.subject.id, label: q.subject.name, subLabel: q.subject.code ? `• ${q.subject.code}` : "" } : null,
            // 👇 نخليها exam حتى لا نكسر الواجهة
            exam: {
              id: q.id,
              label: q.title?.trim() ? q.title : `اختبار • ${new Date(q.createdAt).toLocaleDateString("ar-SA")}`,
            },
          },
        },
      });
    }

    if (type === "study_summary") {
      const summary = await prisma.studySummary.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          slug: true,
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              major: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  university: { select: { id: true, name: true, code: true, countryCode: true } },
                },
              },
            },
          },
        },
      });

      if (!summary) return bad("not_found", undefined, 404);

      const u = summary.subject?.major?.university;
      const m = summary.subject?.major;

      return json({
        data: {
          ownerType: type,
          chain: {
            university: u
              ? { id: u.id, label: u.name, subLabel: `${u.countryCode}${u.code ? ` • ${u.code}` : ""}` }
              : null,
            major: m ? { id: m.id, label: m.name, subLabel: m.code ? `• ${m.code}` : "" } : null,
            subject: summary.subject
              ? { id: summary.subject.id, label: summary.subject.name, subLabel: summary.subject.code ? `• ${summary.subject.code}` : "" }
              : null,
            study_summary: {
              id: summary.id,
              label: summary.title,
              subLabel: summary.slug,
            },
          },
        },
      });
    }

    if (type === "blog_post") {
      const post = await prisma.blogPost.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          publishedAt: true,
          updatedAt: true,
        },
      });

      if (!post) return bad("not_found", undefined, 404);

      const date = post.publishedAt ?? post.updatedAt;
      return json({
        data: {
          ownerType: type,
          chain: {
            blog_post: {
              id: post.id,
              label: post.title,
              subLabel: `${post.slug} • ${post.status} • ${date.toLocaleDateString("ar-SA")}`,
            },
          },
        },
      });
    }

    if (type === "blog_topic") {
      const topic = await prisma.blogTopic.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
          _count: {
            select: {
              primaryPosts: true,
              secondaryPosts: true,
            },
          },
        },
      });

      if (!topic) return bad("not_found", undefined, 404);

      const postsCount = topic._count.primaryPosts + topic._count.secondaryPosts;
      return json({
        data: {
          ownerType: type,
          chain: {
            blog_topic: {
              id: topic.id,
              label: topic.name,
              subLabel: `${topic.slug} • ${topic.isActive ? "نشط" : "غير نشط"} • ${postsCount} مقال`,
            },
          },
        },
      });
    }
  }

  // -----------------------
  // ✅ List options (بحث + فلترة حسب السلسلة)
  // -----------------------
  if (type === "university") {
    const rows = await prisma.university.findMany({
      where: query ? { name: { contains: query, mode: "insensitive" }, isActive: true } : { isActive: true },
      orderBy: { name: "asc" },
      take,
      select: { id: true, name: true, countryCode: true, code: true },
    });

    return json({
      data: rows.map((u) => ({
        id: u.id,
        label: u.name,
        subLabel: `${u.countryCode}${u.code ? ` • ${u.code}` : ""}`,
      })),
    });
  }

  if (type === "major") {
    const where: any = { isActive: true };
    if (universityId) where.universityId = universityId;
    if (query) where.name = { contains: query, mode: "insensitive" };

    const rows = await prisma.major.findMany({
      where,
      orderBy: { name: "asc" },
      take,
      select: { id: true, name: true, code: true, university: { select: { name: true } } },
    });

    return json({
      data: rows.map((m) => ({
        id: m.id,
        label: m.name,
        subLabel: `${m.university?.name ?? ""}${m.code ? ` • ${m.code}` : ""}`.trim(),
      })),
    });
  }

  if (type === "subject") {
    const where: any = { isActive: true };
    if (majorId) where.majorId = majorId;
    if (query) where.name = { contains: query, mode: "insensitive" };

    const rows = await prisma.subject.findMany({
      where,
      orderBy: { name: "asc" },
      take,
      select: { id: true, name: true, code: true, major: { select: { name: true } } },
    });

    return json({
      data: rows.map((s) => ({
        id: s.id,
        label: s.name,
        subLabel: `${s.major?.name ?? ""}${s.code ? ` • ${s.code}` : ""}`.trim(),
      })),
    });
  }

  if (type === "chapter") {
    const where: any = { isActive: true };
    if (subjectId) where.subjectId = subjectId;
    if (query) where.name = { contains: query, mode: "insensitive" };

    const rows = await prisma.chapter.findMany({
      where,
      orderBy: [{ chapterNumber: "asc" }, { name: "asc" }],
      take,
      select: { id: true, name: true, chapterNumber: true },
    });

    return json({
      data: rows.map((c) => ({
        id: c.id,
        label: c.chapterNumber ? `الوحدة ${c.chapterNumber}: ${c.name}` : c.name,
      })),
    });
  }

// ✅ exam => Quiz
if (type === "exam") {
  const where: any = {};
  if (subjectId) where.subjectId = subjectId;
  if (query) where.title = { contains: query, mode: "insensitive" };

  const rows = await prisma.quiz.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      createdAt: true,
      subject: { select: { name: true, code: true } },
    },
  });

  return json({
    data: rows.map((q) => ({
      id: q.id,
      label: q.title?.trim() ? q.title : `اختبار • ${q.id.slice(0, 8)}`,
      subLabel: q.subject ? `${q.subject.name}${q.subject.code ? ` • ${q.subject.code}` : ""}` : "",
    })),
  });
}

if (type === "study_summary") {
  const where: any = {};
  if (subjectId) where.subjectId = subjectId;
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { slug: { contains: query, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.studySummary.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    take,
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      subject: { select: { name: true, code: true } },
    },
  });

  return json({
    data: rows.map((summary) => ({
      id: summary.id,
      label: summary.title,
      subLabel: `${summary.subject?.name ?? ""}${summary.subject?.code ? ` • ${summary.subject.code}` : ""} • ${summary.status} • ${summary.slug}`.trim(),
    })),
  });
}

if (type === "blog_post") {
  const where: any = {};
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { slug: { contains: query, mode: "insensitive" } },
      { excerpt: { contains: query, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.blogPost.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    take,
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  return json({
    data: rows.map((post) => {
      const date = post.publishedAt ?? post.updatedAt;
      return {
        id: post.id,
        label: post.title,
        subLabel: `${post.slug} • ${post.status} • ${date.toLocaleDateString("ar-SA")}`,
      };
    }),
  });
}

if (type === "blog_topic") {
  const where: any = {};
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { slug: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.blogTopic.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    take,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
      _count: {
        select: {
          primaryPosts: true,
          secondaryPosts: true,
        },
      },
    },
  });

  return json({
    data: rows.map((topic) => {
      const postsCount = topic._count.primaryPosts + topic._count.secondaryPosts;
      return {
        id: topic.id,
        label: topic.name,
        subLabel: `${topic.slug} • ${topic.isActive ? "نشط" : "غير نشط"} • ${postsCount} مقال`,
      };
    }),
  });
}


  return bad("unsupported_type");
}
