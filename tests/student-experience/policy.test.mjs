import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

const subscriptionReturn = moduleLoader()("src/lib/subscription-return.ts");
const countryVisibility = moduleLoader()("src/lib/public-country-visibility.ts");

test("student sign-in returns only to a safe, exact subscription target", () => {
  const key = subscriptionReturn.subscriptionReturnKey("quiz", "11111111-1111-4111-8111-111111111111");
  const callback = subscriptionReturn.callbackWithSubscriptionReturn("/SA/university/example?tab=quizzes", key);
  const url = new URL(callback, "https://mustawak.com");
  assert.equal(url.pathname, "/SA/university/example");
  assert.equal(url.searchParams.get("tab"), "quizzes");
  assert.equal(url.searchParams.get("continueAccess"), key);
  assert.equal(subscriptionReturn.callbackWithSubscriptionReturn("//evil.example", key), "/account?continueAccess=" + encodeURIComponent(key));
  assert.equal(subscriptionReturn.subscriptionReturnKey("quiz", "bad/id"), null);
});

test("student UI exposes pending orders without treating them as access", () => {
  const quizzes = readFileSync("src/components/public/subscription-access.tsx", "utf8");
  const summaries = readFileSync("src/components/public/study-summaries/study-summary-subscribe-button.tsx", "utf8");
  const attachments = readFileSync("src/components/public/chapter-attachments.tsx", "utf8");
  for (const source of [quizzes, summaries, attachments]) {
    assert.match(source, /activeOrder/);
    assert.match(source, /\/account\/orders\//);
  }
  assert.match(attachments, /access\/status\?subjectId=/);
  assert.match(attachments, /يتطلب اشتراكًا/);
});

test("chapter details use keyboard-accessible tabs and keep files with tests", () => {
  const details = readFileSync("src/components/public/chapter-details.tsx", "utf8");
  const tabs = readFileSync("src/components/public/chapter-content-tabs.tsx", "utf8");
  assert.ok(details.indexOf("SubjectQuizzesSection") < details.indexOf("ChapterAttachments"));
  assert.match(details, /tests=\{<>[\s\S]*SubjectQuizzesSection[\s\S]*ChapterAttachments/);
  assert.match(tabs, /TabsTrigger value="tests"/);
  assert.match(tabs, /TabsTrigger value="summaries"/);
  assert.match(tabs, /if \(!hasTests\)/);
  assert.match(tabs, /if \(!hasSummaries\)/);
});

test("Google sign-in uses the recognizable Google mark, not a browser icon", () => {
  const button = readFileSync("src/components/auth/google-auth-button.tsx", "utf8");
  assert.match(button, /function GoogleMark/);
  assert.match(button, /#4285F4/);
  assert.doesNotMatch(button, /\bChrome\b/);
});

test("quiz play hides question tags and persists an optional timer per attempt", () => {
  const question = readFileSync("src/components/public/quiz/question-display.tsx", "utf8");
  const timer = readFileSync("src/components/public/quiz/quiz-timer.tsx", "utf8");
  const runtime = readFileSync("src/components/public/quiz/use-quiz-runtime.ts", "utf8");
  const quizInterface = readFileSync("src/components/public/quiz/quiz-interface.tsx", "utf8");

  assert.doesNotMatch(question, /question\.tags/);
  assert.match(timer, /if \(!enabled \|\| remainingRef\.current <= 0\) return/);
  assert.match(timer, /لن يتم التسليم تلقائيًا/);
  assert.match(runtime, /initialTimerEnabled = source\.timerEnabled \?\? true/);
  assert.match(runtime, /timerEnabled: true/);
  assert.match(runtime, /setTimerEnabledState\(resumeCandidate\.timerEnabled \?\? true\)/);
  assert.match(runtime, /typeof x\.timerEnabled === "boolean"/);
  assert.match(runtime, /localStorage\.setItem\([\s\S]*timerEnabled: enabled/);
  assert.match(quizInterface, /completedSession\.endTime/);
  assert.match(quizInterface, /completedSession\.startTime/);
});

test("quiz results omit the two requested aggregate guidance cards", () => {
  const guidance = readFileSync(
    "src/components/public/quiz/result/result-study-guidance.tsx",
    "utf8"
  );

  assert.doesNotMatch(guidance, /وسوم تحتاج انتباه/);
  assert.doesNotMatch(guidance, /ملاحظة على مستوى الأسئلة/);
  assert.match(guidance, /reviewWrongHref/);
  assert.match(guidance, /buildChapterFocus/);
});

test("country switcher hides only for a Saudi-detected visitor on a Saudi route", () => {
  assert.equal(countryVisibility.shouldShowCountrySwitcher("/SA", "SA"), false);
  assert.equal(countryVisibility.shouldShowCountrySwitcher("/SA/university", "SA"), false);
  assert.equal(countryVisibility.shouldShowCountrySwitcher("/YE", "SA"), true);
  assert.equal(countryVisibility.shouldShowCountrySwitcher("/SA", "YE"), true);
  assert.equal(countryVisibility.shouldShowCountrySwitcher("/SA", null), true);
  assert.equal(countryVisibility.shouldShowCountrySwitcher("/quiz/example", "SA"), true);
  assert.equal(countryVisibility.detectedCountryFromCookie("foo=1; detected_cc=SA"), "SA");
  assert.equal(countryVisibility.detectedCountryFromCookie("detected_cc=US"), null);
});

test("middleware keeps detected geography separate from the selected country", () => {
  const middleware = readFileSync("src/middleware.ts", "utf8");
  assert.match(middleware, /DETECTED_COUNTRY_COOKIE/);
  assert.match(middleware, /detectedCountry/);
  assert.match(middleware, /res\.cookies\.delete\(DETECTED_COUNTRY_COOKIE\)/);
  assert.match(middleware, /res\.cookies\.set\("cc", cc/);
});
