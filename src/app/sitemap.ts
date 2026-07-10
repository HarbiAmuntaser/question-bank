import type { MetadataRoute } from "next";

import { SUPPORTED_COUNTRIES, type CountryCode, type InstitutionType } from "@/config/regions";
import { prisma } from "@/lib/prisma";
import { encodeSlugPath, stripPrefix } from "@/lib/public/slug-utils";
import { BLOG_TOPIC_INDEX_MIN_POSTS, getSearchIndexingMode } from "@/lib/search-indexing";

const SITE_URL = "https://mustawak.com";
const DYNAMIC_LIMIT = 1000;

export const revalidate = 3600;

type SeoLookup = {
  slug: string;
  noindex: boolean;
};

type SitemapEntry = MetadataRoute.Sitemap[number];

function absoluteUrl(path: string) {
  if (path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function entry(path: string, input: Omit<SitemapEntry, "url"> = {}): SitemapEntry {
  return {
    url: absoluteUrl(path),
    lastModified: input.lastModified ?? new Date(),
    changeFrequency: input.changeFrequency,
    priority: input.priority,
  };
}

function supportedCountry(raw: string | null): CountryCode | null {
  const cc = (raw ?? "").trim().toUpperCase() as CountryCode;
  return cc in SUPPORTED_COUNTRIES ? cc : null;
}

function supportedType(cc: CountryCode, raw: unknown): InstitutionType | null {
  const type = String(raw ?? "").trim().toLowerCase() as InstitutionType;
  return SUPPORTED_COUNTRIES[cc].types.includes(type) ? type : null;
}

function latestDate(...dates: Array<Date | null | undefined>) {
  const valid = dates.filter((date): date is Date => date instanceof Date);
  if (!valid.length) return new Date();
  return valid.reduce((latest, date) => (date > latest ? date : latest), valid[0]);
}

function routeSlug(seo: SeoLookup | null | undefined, fallback: string | null | undefined, prefix: string) {
  if (seo?.noindex) return null;
  const raw = seo?.slug || fallback;
  if (!raw) return null;
  return encodeSlugPath(stripPrefix(raw, prefix));
}

function seoMap(rows: Array<{ ownerId: string; slug: string; noindex: boolean }>) {
  return new Map<string, SeoLookup>(
    rows.map((row) => [row.ownerId, { slug: row.slug, noindex: row.noindex }]),
  );
}

async function seoRows(ownerType: "university" | "major" | "subject" | "exam" | "study_summary", ownerIds: string[]) {
  if (!ownerIds.length) return new Map<string, SeoLookup>();

  const rows = await prisma.seoMeta.findMany({
    where: {
      ownerType,
      locale: "ar",
      ownerId: { in: ownerIds },
    },
    select: {
      ownerId: true,
      slug: true,
      noindex: true,
    },
  });

  return seoMap(rows);
}

async function institutionEntries(): Promise<SitemapEntry[]> {
  const universities = await prisma.university.findMany({
    where: {
      isActive: true,
      countryCode: { in: Object.keys(SUPPORTED_COUNTRIES) },
    },
    orderBy: { updatedAt: "desc" },
    take: DYNAMIC_LIMIT,
    select: {
      id: true,
      code: true,
      countryCode: true,
      institutionType: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const universitySeo = await seoRows("university", universities.map((university) => university.id));

  return universities.flatMap((university) => {
    const cc = supportedCountry(university.countryCode);
    if (!cc) return [];

    const type = supportedType(cc, university.institutionType);
    if (!type) return [];

    const slug = routeSlug(universitySeo.get(university.id), university.code ?? university.id, "جامعات");
    if (!slug) return [];

    return [
      entry(`/${cc}/${type}/universities/${slug}`, {
        lastModified: latestDate(university.updatedAt, university.createdAt),
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ];
  });
}

async function majorEntries(): Promise<SitemapEntry[]> {
  const majors = await prisma.major.findMany({
    where: {
      isActive: true,
      university: {
        isActive: true,
        countryCode: { in: Object.keys(SUPPORTED_COUNTRIES) },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: DYNAMIC_LIMIT,
    select: {
      id: true,
      code: true,
      createdAt: true,
      updatedAt: true,
      university: {
        select: {
          id: true,
          code: true,
          countryCode: true,
          institutionType: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  const [majorSeo, universitySeo] = await Promise.all([
    seoRows("major", majors.map((major) => major.id)),
    seoRows("university", majors.map((major) => major.university.id)),
  ]);

  return majors.flatMap((major) => {
    const cc = supportedCountry(major.university.countryCode);
    if (!cc) return [];

    const type = supportedType(cc, major.university.institutionType);
    if (!type) return [];

    const universitySlug = routeSlug(universitySeo.get(major.university.id), major.university.code ?? major.university.id, "جامعات");
    const majorSlug = routeSlug(majorSeo.get(major.id), major.code ?? major.id, "تخصصات");
    if (!universitySlug || !majorSlug) return [];

    return [
      entry(`/${cc}/${type}/universities/${universitySlug}/majors/${majorSlug}`, {
        lastModified: latestDate(major.updatedAt, major.createdAt, major.university.updatedAt),
        changeFrequency: "weekly",
        priority: 0.65,
      }),
    ];
  });
}

async function subjectEntries(): Promise<SitemapEntry[]> {
  const subjects = await prisma.subject.findMany({
    where: {
      isActive: true,
      major: {
        isActive: true,
        university: {
          isActive: true,
          countryCode: { in: Object.keys(SUPPORTED_COUNTRIES) },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: DYNAMIC_LIMIT,
    select: {
      id: true,
      code: true,
      createdAt: true,
      updatedAt: true,
      major: {
        select: {
          id: true,
          code: true,
          createdAt: true,
          updatedAt: true,
          university: {
            select: {
              id: true,
              code: true,
              countryCode: true,
              institutionType: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  const [subjectSeo, majorSeo, universitySeo] = await Promise.all([
    seoRows("subject", subjects.map((subject) => subject.id)),
    seoRows("major", subjects.map((subject) => subject.major.id)),
    seoRows("university", subjects.map((subject) => subject.major.university.id)),
  ]);

  return subjects.flatMap((subject) => {
    const cc = supportedCountry(subject.major.university.countryCode);
    if (!cc) return [];

    const type = supportedType(cc, subject.major.university.institutionType);
    if (!type) return [];

    const universitySlug = routeSlug(
      universitySeo.get(subject.major.university.id),
      subject.major.university.code ?? subject.major.university.id,
      "جامعات",
    );
    const majorSlug = routeSlug(majorSeo.get(subject.major.id), subject.major.code ?? subject.major.id, "تخصصات");
    const subjectSlug = routeSlug(subjectSeo.get(subject.id), subject.code ?? subject.id, "مواد");
    if (!universitySlug || !majorSlug || !subjectSlug) return [];

    return [
      entry(`/${cc}/${type}/universities/${universitySlug}/majors/${majorSlug}/subjects/${subjectSlug}`, {
        lastModified: latestDate(subject.updatedAt, subject.createdAt, subject.major.updatedAt),
        changeFrequency: "weekly",
        priority: 0.65,
      }),
    ];
  });
}

async function quizEntries(): Promise<SitemapEntry[]> {
  const quizzes = await prisma.quiz.findMany({
    where: {
      isActive: true,
    },
    orderBy: { updatedAt: "desc" },
    take: DYNAMIC_LIMIT,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      subject: {
        select: {
          id: true,
          code: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          major: {
            select: {
              id: true,
              code: true,
              isActive: true,
              updatedAt: true,
              university: {
                select: {
                  id: true,
                  code: true,
                  countryCode: true,
                  institutionType: true,
                  isActive: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      },
      questions: {
        take: 1,
        orderBy: { questionOrder: "asc" },
        select: {
          question: {
            select: {
              chapter: {
                select: {
                  subject: {
                    select: {
                      id: true,
                      code: true,
                      isActive: true,
                      createdAt: true,
                      updatedAt: true,
                      major: {
                        select: {
                          id: true,
                          code: true,
                          isActive: true,
                          updatedAt: true,
                          university: {
                            select: {
                              id: true,
                              code: true,
                              countryCode: true,
                              institutionType: true,
                              isActive: true,
                              updatedAt: true,
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
      },
    },
  });

  const effectiveSubjects = quizzes
    .map((quiz) => quiz.subject ?? quiz.questions[0]?.question.chapter.subject ?? null)
    .filter((subject): subject is NonNullable<(typeof quizzes)[number]["subject"]> => Boolean(subject));

  const [quizSeo, subjectSeo, majorSeo, universitySeo] = await Promise.all([
    seoRows("exam", quizzes.map((quiz) => quiz.id)),
    seoRows("subject", effectiveSubjects.map((subject) => subject.id)),
    seoRows("major", effectiveSubjects.map((subject) => subject.major.id)),
    seoRows("university", effectiveSubjects.map((subject) => subject.major.university.id)),
  ]);

  return quizzes.flatMap((quiz) => {
    const subject = quiz.subject ?? quiz.questions[0]?.question.chapter.subject ?? null;
    if (!subject?.isActive || !subject.major.isActive || !subject.major.university.isActive) return [];

    const cc = supportedCountry(subject.major.university.countryCode);
    if (!cc) return [];

    const type = supportedType(cc, subject.major.university.institutionType);
    if (!type) return [];

    const universitySlug = routeSlug(
      universitySeo.get(subject.major.university.id),
      subject.major.university.code ?? subject.major.university.id,
      "جامعات",
    );
    const majorSlug = routeSlug(majorSeo.get(subject.major.id), subject.major.code ?? subject.major.id, "تخصصات");
    const subjectSlug = routeSlug(subjectSeo.get(subject.id), subject.code ?? subject.id, "مواد");
    const quizSlug = routeSlug(quizSeo.get(quiz.id), quiz.id, "اختبارات");
    if (!universitySlug || !majorSlug || !subjectSlug || !quizSlug) return [];

    return [
      entry(`/${cc}/${type}/universities/${universitySlug}/majors/${majorSlug}/subjects/${subjectSlug}/quizzes/${quizSlug}`, {
        lastModified: latestDate(quiz.updatedAt, quiz.createdAt, subject.updatedAt),
        changeFrequency: "weekly",
        priority: 0.6,
      }),
    ];
  });
}

async function studySummaryEntries(): Promise<SitemapEntry[]> {
  const summaries = await prisma.studySummary.findMany({
    where: {
      status: "published",
      publishedAt: { not: null, lte: new Date() },
      language: "ar",
      subject: {
        isActive: true,
        major: {
          isActive: true,
          university: {
            isActive: true,
            countryCode: { in: Object.keys(SUPPORTED_COUNTRIES) },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: DYNAMIC_LIMIT,
    select: {
      id: true,
      slug: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      subject: {
        select: {
          id: true,
          code: true,
          createdAt: true,
          updatedAt: true,
          major: {
            select: {
              id: true,
              code: true,
              updatedAt: true,
              university: {
                select: {
                  id: true,
                  code: true,
                  countryCode: true,
                  institutionType: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const [summarySeo, subjectSeo, majorSeo, universitySeo] = await Promise.all([
    seoRows("study_summary", summaries.map((summary) => summary.id)),
    seoRows("subject", summaries.map((summary) => summary.subject.id)),
    seoRows("major", summaries.map((summary) => summary.subject.major.id)),
    seoRows("university", summaries.map((summary) => summary.subject.major.university.id)),
  ]);

  return summaries.flatMap((summary) => {
    if (summarySeo.get(summary.id)?.noindex) return [];

    const subject = summary.subject;
    const cc = supportedCountry(subject.major.university.countryCode);
    if (!cc) return [];

    const type = supportedType(cc, subject.major.university.institutionType);
    if (!type) return [];

    const universitySlug = routeSlug(
      universitySeo.get(subject.major.university.id),
      subject.major.university.code ?? subject.major.university.id,
      "جامعات",
    );
    const majorSlug = routeSlug(majorSeo.get(subject.major.id), subject.major.code ?? subject.major.id, "تخصصات");
    const subjectSlug = routeSlug(subjectSeo.get(subject.id), subject.code ?? subject.id, "مواد");
    const summarySlug = encodeSlugPath(stripPrefix(summary.slug, "ملخصات"));
    if (!universitySlug || !majorSlug || !subjectSlug || !summarySlug) return [];

    return [
      entry(`/${cc}/${type}/universities/${universitySlug}/majors/${majorSlug}/subjects/${subjectSlug}/summaries/${summarySlug}`, {
        lastModified: latestDate(summary.updatedAt, summary.publishedAt, summary.createdAt, subject.updatedAt),
        changeFrequency: "weekly",
        priority: 0.55,
      }),
    ];
  });
}

async function blogEntries(): Promise<SitemapEntry[]> {
  const posts = await prisma.blogPost.findMany({
    where: {
      status: "published",
      publishedAt: { not: null, lte: new Date() },
    },
    orderBy: { updatedAt: "desc" },
    take: DYNAMIC_LIMIT,
    select: {
      id: true,
      slug: true,
      visibility: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      countries: { select: { countryCode: true } },
    },
  });

  const seoRows = posts.length
    ? await prisma.seoMeta.findMany({
        where: {
          ownerType: "blog_post",
          locale: "ar",
          ownerId: { in: posts.map((post) => post.id) },
        },
        select: { ownerId: true, noindex: true },
      })
    : [];
  const noindexPostIds = new Set(seoRows.filter((seo) => seo.noindex).map((seo) => seo.ownerId));

  return posts.flatMap((post) => {
    if (noindexPostIds.has(post.id)) return [];

    const countries = post.visibility === "global"
      ? Object.keys(SUPPORTED_COUNTRIES)
      : post.countries
          .map((country) => supportedCountry(country.countryCode))
          .filter((cc): cc is CountryCode => Boolean(cc));

    return countries.map((cc) =>
      entry(`/${cc}/blog/${encodeURIComponent(post.slug)}`, {
        lastModified: latestDate(post.updatedAt, post.publishedAt, post.createdAt),
        changeFrequency: "weekly",
        priority: 0.65,
      }),
    );
  });
}

async function blogTopicEntries(): Promise<SitemapEntry[]> {
  const posts = await prisma.blogPost.findMany({
    where: {
      status: "published",
      publishedAt: { not: null, lte: new Date() },
      OR: [
        { primaryTopic: { isActive: true } },
        { secondaryTopics: { some: { topic: { isActive: true } } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: DYNAMIC_LIMIT,
    select: {
      id: true,
      visibility: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      countries: { select: { countryCode: true } },
      primaryTopic: {
        select: {
          id: true,
          slug: true,
          isActive: true,
          updatedAt: true,
        },
      },
      secondaryTopics: {
        select: {
          topic: {
            select: {
              id: true,
              slug: true,
              isActive: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  const topicIds = Array.from(
    new Set(
      posts
        .flatMap((post) => [
          post.primaryTopic?.isActive ? post.primaryTopic.id : null,
          ...post.secondaryTopics.map(({ topic }) => (topic.isActive ? topic.id : null)),
        ])
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const seoRows = topicIds.length
    ? await prisma.seoMeta.findMany({
        where: {
          ownerType: "blog_topic",
          locale: "ar",
          ownerId: { in: topicIds },
        },
        select: { ownerId: true, noindex: true },
      })
    : [];
  const noindexTopicIds = new Set(seoRows.filter((seo) => seo.noindex).map((seo) => seo.ownerId));

  const topicCountryMap = new Map<
    string,
    {
      cc: CountryCode;
      topicId: string;
      slug: string;
      postIds: Set<string>;
      lastModified: Date;
    }
  >();

  for (const post of posts) {
    const countries = post.visibility === "global"
      ? Object.keys(SUPPORTED_COUNTRIES)
      : post.countries
          .map((country) => supportedCountry(country.countryCode))
          .filter((cc): cc is CountryCode => Boolean(cc));

    const topics = Array.from(
      new Map(
        [
          post.primaryTopic?.isActive ? post.primaryTopic : null,
          ...post.secondaryTopics.map(({ topic }) => (topic.isActive ? topic : null)),
        ]
          .filter((topic): topic is NonNullable<typeof post.primaryTopic> => Boolean(topic))
          .map((topic) => [topic.id, topic]),
      ).values(),
    ).filter((topic) => !noindexTopicIds.has(topic.id));

    for (const topic of topics) {
      for (const cc of countries) {
        const supportedCc = supportedCountry(cc);
        if (!supportedCc) continue;

        const key = `${supportedCc}:${topic.id}`;
        const existing = topicCountryMap.get(key);
        if (existing) {
          existing.postIds.add(post.id);
          existing.lastModified = latestDate(existing.lastModified, topic.updatedAt, post.updatedAt, post.publishedAt, post.createdAt);
          continue;
        }

        topicCountryMap.set(key, {
          cc: supportedCc,
          topicId: topic.id,
          slug: topic.slug,
          postIds: new Set([post.id]),
          lastModified: latestDate(topic.updatedAt, post.updatedAt, post.publishedAt, post.createdAt),
        });
      }
    }
  }

  return Array.from(topicCountryMap.values())
    .filter((item) => item.postIds.size >= BLOG_TOPIC_INDEX_MIN_POSTS)
    .map((item) =>
      entry(`/${item.cc}/blog/topics/${encodeURIComponent(item.slug)}`, {
        lastModified: item.lastModified,
        changeFrequency: "weekly",
        priority: 0.55,
      }),
    );
}

async function safeDynamicEntries(label: string, loader: () => Promise<SitemapEntry[]>) {
  try {
    return await loader();
  } catch {
    console.warn(`[sitemap] Failed to load ${label}; using static fallback for this section.`);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const indexingMode = getSearchIndexingMode();
  const staticEntries: MetadataRoute.Sitemap = [
    ...Object.entries(SUPPORTED_COUNTRIES).flatMap(([cc, config]) => [
      entry(`/${cc}`, { lastModified: now, changeFrequency: "daily", priority: 0.9 }),
      ...(indexingMode === "full"
        ? config.types.map((type) =>
            entry(`/${cc}/${type}`, {
              lastModified: now,
              changeFrequency: "daily",
              priority: 0.8,
            }),
          )
        : []),
      entry(`/${cc}/blog`, { lastModified: now, changeFrequency: "daily", priority: 0.7 }),
    ]),
    entry("/public/privacy", { lastModified: now, changeFrequency: "monthly", priority: 0.5 }),
    entry("/public/terms", { lastModified: now, changeFrequency: "monthly", priority: 0.5 }),
    entry("/public/cookies", { lastModified: now, changeFrequency: "monthly", priority: 0.4 }),
    entry("/public/faq", { lastModified: now, changeFrequency: "monthly", priority: 0.5 }),
    entry("/public/help", { lastModified: now, changeFrequency: "monthly", priority: 0.5 }),
    entry("/public/contact", { lastModified: now, changeFrequency: "monthly", priority: 0.4 }),
  ];

  const dynamicEntries = await Promise.all(
    indexingMode === "full"
      ? [
          safeDynamicEntries("institutions", institutionEntries),
          safeDynamicEntries("majors", majorEntries),
          safeDynamicEntries("subjects", subjectEntries),
          safeDynamicEntries("quizzes", quizEntries),
          safeDynamicEntries("study summaries", studySummaryEntries),
          safeDynamicEntries("blog posts", blogEntries),
          safeDynamicEntries("blog topics", blogTopicEntries),
        ]
      : [
          safeDynamicEntries("blog posts", blogEntries),
          safeDynamicEntries("blog topics", blogTopicEntries),
        ],
  );

  return [...staticEntries, ...dynamicEntries.flat()];
}
