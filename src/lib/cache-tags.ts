export const CACHE_TTL = {
  publicShort: 300,
  publicMedium: 600,
  publicStable: 3600,
  publicLong: 21600,
  adminList: 60,
  adminDashboard: 300,
  adminAnalytics: 86400,
} as const;

export const CACHE_CONTROL = {
  // Never allow private/admin or user-specific payloads to be cached by a shared CDN.
  PRIVATE_NO_STORE: "private, no-store, no-cache, max-age=0, must-revalidate",
  publicSMaxage: (seconds: number, staleWhileRevalidate = 60) =>
    `public, s-maxage=${seconds}, stale-while-revalidate=${staleWhileRevalidate}`,
} as const;

export const CACHE_TAGS = {
  admin: {
    analytics: "admin:analytics",
    attachments: "admin:attachments",
    blog: "admin:blog",
    chapters: "admin:chapters",
    dashboard: "admin:dashboard",
    exams: "admin:exams",
    majors: "admin:majors",
    questions: "admin:questions",
    quizzes: "admin:quizzes",
    seo: "admin:seo",
    summaries: "admin:summaries",
    subjects: "admin:subjects",
    universities: "admin:universities",
    users: "admin:users",
  },
  public: {
    blog: "public:blog",
    blogCountry: (cc: string) => `public:blog:country:${cc.toUpperCase()}`,
    blogPost: (id: string) => `public:blog:post:${id}`,
    blogSlug: (slug: string) => `public:blog:slug:${slug}`,
    blogTopics: "public:blog:topics",
    blogTags: "public:blog:tags",
    institutions: "public:institutions",
    institutionsCountry: (cc: string) => `public:institutions:country:${cc.toUpperCase()}`,
    institution: (id: string) => `public:institution:${id}`,
    majors: "public:majors",
    majorsByUniversity: (id: string) => `public:majors:university:${id}`,
    major: (id: string) => `public:major:${id}`,
    subjects: "public:subjects",
    subjectsByMajor: (id: string) => `public:subjects:major:${id}`,
    subject: (id: string) => `public:subject:${id}`,
    summaries: "public:summaries",
    summariesBySubject: (id: string) => `public:summaries:subject:${id}`,
    summary: (id: string) => `public:summary:${id}`,
    quizzes: "public:quizzes",
    quizzesBySubject: (id: string) => `public:quizzes:subject:${id}`,
    quiz: (id: string) => `public:quiz:${id}`,
    seo: "public:seo",
    seoOwner: (ownerType: string, ownerId: string) => `public:seo:${ownerType}:${ownerId}`,
    stats: "public:stats",
  },
} as const;

export function cacheTags(...tags: Array<string | false | null | undefined>) {
  return tags.filter((tag): tag is string => typeof tag === "string" && tag.length > 0);
}
