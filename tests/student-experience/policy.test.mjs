import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

const subscriptionReturn = moduleLoader()("src/lib/subscription-return.ts");

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
