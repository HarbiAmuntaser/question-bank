import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "./load-module.mjs";

const source = (path) => readFileSync(path, "utf8");

test("dashboard caches aggregate statistics for 24 hours and keeps admin responses private", async () => {
  let cacheOptions;
  const countModel = (value) => ({ count: async () => value });
  const prisma = {
    university: countModel(1), college: countModel(2), major: countModel(3), subject: countModel(4),
    chapter: countModel(5), studySummary: countModel(6), question: countModel(7), quiz: countModel(8),
    blogPost: { count: async () => 9, aggregate: async () => ({ _sum: { viewsCount: 10 } }) },
  };
  const load = moduleLoader({
    "@/lib/prisma": { prisma },
    "next/cache": { unstable_cache: (fn, _key, options) => { cacheOptions = options; return fn; } },
    "@/lib/adsense/config": { getAdSenseRuntimeConfig: () => ({ requestedEnabled: false, enabled: false }) },
    "@/lib/server/auth-config": {
      googleAuthConfigured: () => false, mailConfig: () => ({}), studentRegistrationEnabled: () => false,
    },
    "@/lib/server/payment-scope": {
      paymentCodesEnabled: () => false, paymentReviewEnabled: () => false, paymentSalesEnabled: () => false,
    },
    "@/lib/server/storage/config": { getR2StorageConfig: () => ({}) },
    "@/lib/server/telegram/config": { getTelegramRuntimeConfig: () => ({ requestedEnabled: false, enabled: false }) },
  });

  const dashboard = load("src/lib/admin/dashboard.ts");
  const stats = await dashboard.getDashboardStats();
  assert.equal(cacheOptions.revalidate, 86_400);
  assert.deepEqual(cacheOptions.tags, ["admin:dashboard:stats"]);
  assert.equal(stats.colleges, 2);
  assert.equal(stats.summaries, 6);
  assert.equal(stats.publishedBlogPosts, 9);
  assert.equal(stats.blogViews, 10);
  assert.match(source("src/app/api/v1/admin/dashboard/route.ts"), /PRIVATE_NO_STORE/);
});

test("dashboard and analytics pages use server services instead of internal HTTP", () => {
  for (const path of ["src/app/admin/page.tsx", "src/app/admin/analytics/page.tsx"]) {
    const content = source(path);
    assert.doesNotMatch(content, /adminApiFetch/);
    assert.match(content, /requireAdminPage/);
  }
});

test("analytics removes unbounded question and timeline analysis and returns bounded blog metrics", async () => {
  const analyticsSource = source("src/lib/admin/analytics.ts");
  assert.doesNotMatch(analyticsSource, /question\.findMany|userAnswer\.groupBy|timeSeriesData|difficultyBreakdown/);
  assert.match(analyticsSource, /MAX_QUIZ_RESULTS = 100/);
  assert.match(analyticsSource, /TOP_BLOG_POSTS = 5/);

  const prisma = {
    anonymousSession: { count: async () => 2 },
    quiz: {
      count: async () => 3,
      findMany: async () => [{
        id: "quiz-1", title: "Quiz", subject: { id: "subject-1", name: "Subject" },
        questions: [{ question: { difficultyLevel: "medium" } }],
      }],
    },
    question: { count: async () => 4 },
    userAnswer: { count: async () => 5 },
    quizAttempt: {
      count: async ({ where }) => where.isCompleted ? 6 : 8,
      aggregate: async () => ({ _avg: { score: 75 } }),
      groupBy: async ({ where }) => where.isCompleted
        ? [{ quizId: "quiz-1", _count: { quizId: 1 } }]
        : [{ quizId: "quiz-1", _count: { quizId: 2 }, _avg: { score: 70, timeSpent: 90 } }],
    },
    blogPost: {
      groupBy: async () => [
        { status: "published", _count: { _all: 3 } },
        { status: "draft", _count: { _all: 1 } },
      ],
      aggregate: async () => ({ _sum: { viewsCount: 42 } }),
      count: async () => 1,
      findMany: async () => [{ id: "post-1", title: "Post", viewsCount: 42, publishedAt: new Date("2026-01-01T00:00:00Z") }],
    },
  };
  const analytics = moduleLoader({ "@/lib/prisma": { prisma } })("src/lib/admin/analytics.ts");
  const data = await analytics.getAnalyticsData(30);

  assert.equal(data.overview.totalAttempts, 8);
  assert.equal(data.quizPerformance.length, 1);
  assert.equal(data.subjectPerformance[0].subjectId, "subject-1");
  assert.deepEqual(data.blog, {
    totalPosts: 4, publishedPosts: 3, draftPosts: 1, publishedInPeriod: 1, totalViews: 42,
    topPosts: [{ id: "post-1", title: "Post", viewsCount: 42, publishedAt: "2026-01-01T00:00:00.000Z" }],
  });
});

test("analytics UI removes question, report and heavy overview components", () => {
  const dashboard = source("src/components/admin/analytics-dashboard.tsx");
  assert.doesNotMatch(dashboard, /DifficultyBreakdown|PerformanceCharts|ExportReports|QuestionAnalysisTable/);
  assert.match(dashboard, /BlogAnalytics/);
  assert.match(source("src/app/api/v1/admin/analytics/export/route.ts"), /status: 410/);
});

test("external system checks are explicit, authenticated and absent from page rendering", () => {
  const page = source("src/app/admin/page.tsx");
  const panel = source("src/components/admin/system-status-panel.tsx");
  const route = source("src/app/api/v1/admin/dashboard/health/route.ts");
  assert.doesNotMatch(page, /verifyAuthMailConnection|verifyR2StorageConnection/);
  assert.match(panel, /method: "POST"/);
  assert.match(route, /verifyAdmin\(req, "dashboard:read"\)/);
  assert.match(route, /PRIVATE_NO_STORE/);
});
