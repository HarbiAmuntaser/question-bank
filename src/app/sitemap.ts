import type { MetadataRoute } from "next";

import { SUPPORTED_COUNTRIES, type CountryCode, type InstitutionType } from "@/config/regions";
import { prisma } from "@/lib/prisma";
import { encodeSlugPath, stripPrefix } from "@/lib/public/slug-utils";

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

async function seoRows(ownerType: "university" | "major" | "subject" | "exam", ownerIds: string[]) {
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    entry("/", { lastModified: now, changeFrequency: "daily", priority: 1 }),
    ...Object.entries(SUPPORTED_COUNTRIES).flatMap(([cc, config]) => [
      entry(`/${cc}`, { lastModified: now, changeFrequency: "daily", priority: 0.9 }),
      ...config.types.map((type) =>
        entry(`/${cc}/${type}`, {
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.8,
        }),
      ),
    ]),
    entry("/public/privacy", { lastModified: now, changeFrequency: "monthly", priority: 0.5 }),
    entry("/public/terms", { lastModified: now, changeFrequency: "monthly", priority: 0.5 }),
    entry("/public/cookies", { lastModified: now, changeFrequency: "monthly", priority: 0.4 }),
    entry("/public/faq", { lastModified: now, changeFrequency: "monthly", priority: 0.5 }),
    entry("/public/help", { lastModified: now, changeFrequency: "monthly", priority: 0.5 }),
    entry("/public/contact", { lastModified: now, changeFrequency: "monthly", priority: 0.4 }),
  ];

  const dynamicEntries = await Promise.all([
    institutionEntries(),
    majorEntries(),
    subjectEntries(),
    quizEntries(),
  ]);

  return [...staticEntries, ...dynamicEntries.flat()];
}
