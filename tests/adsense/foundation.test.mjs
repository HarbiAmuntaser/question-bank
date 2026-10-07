import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

const config = moduleLoader()("src/lib/adsense/config.ts");
const policy = moduleLoader()("src/lib/adsense/eligibility.ts");

const freePage = {
  pathname: "/SA/blog/example",
  pageKind: "blog_article",
  contentAccess: "free",
  published: true,
  hasPublisherContent: true,
};

test("publisher identity keeps pub and ca-pub forms separate", () => {
  const identity = config.parseAdSensePublisherId(" pub-1234567890123456 ");
  assert.deepEqual(identity, {
    publisherId: "pub-1234567890123456",
    clientId: "ca-pub-1234567890123456",
  });
  assert.equal(
    config.getAdsTxtLine(identity),
    "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0",
  );

  for (const value of [
    "",
    "ca-pub-1234567890123456",
    "pub-123",
    "pub-123456789012345x",
    "pub-12345678901234567",
  ]) {
    assert.equal(config.parseAdSensePublisherId(value), null, value);
  }
});

test("runtime is fail-closed unless the exact switch and publisher ID are valid", () => {
  assert.equal(config.getAdSenseRuntimeConfig({}).enabled, false);
  assert.equal(
    config.getAdSenseRuntimeConfig({
      ADSENSE_ENABLED: "true",
      ADSENSE_PUBLISHER_ID: "ca-pub-1234567890123456",
    }).enabled,
    false,
  );

  const configuredButClosed = config.getAdSenseRuntimeConfig({
    ADSENSE_ENABLED: "false",
    ADSENSE_PUBLISHER_ID: "pub-1234567890123456",
  });
  assert.equal(configuredButClosed.enabled, false);
  assert.equal(configuredButClosed.identity.clientId, "ca-pub-1234567890123456");

  assert.equal(
    config.getAdSenseRuntimeConfig({
      ADSENSE_ENABLED: "true",
      ADSENSE_PUBLISHER_ID: "pub-1234567890123456",
    }).enabled,
    true,
  );
});

test("paid, private, payment and uncertain pages are never eligible", () => {
  for (const input of [
    { ...freePage, contentAccess: "paid" },
    { ...freePage, contentAccess: "mixed" },
    { ...freePage, contentAccess: "unknown" },
    { ...freePage, published: false },
    { ...freePage, hasPublisherContent: false },
    { ...freePage, pathname: "/admin" },
    { ...freePage, pathname: "/auth/signin" },
    { ...freePage, pathname: "/account/orders" },
    { ...freePage, pathname: "/payment/checkout" },
  ]) {
    const decision = policy.evaluateAdsEligibility(input);
    assert.equal(decision.eligible, false, JSON.stringify(input));
    assert.equal(decision.allowAutoAds, false);
    assert.deepEqual(decision.manualPlacements, []);
  }
});

test("quiz play and targeted review stay blocked while intro and result are manual-only", () => {
  for (const pageKind of ["quiz_play", "targeted_review"]) {
    assert.equal(
      policy.evaluateAdsEligibility({ ...freePage, pathname: "/education/quiz", pageKind }).eligible,
      false,
    );
  }

  const intro = policy.evaluateAdsEligibility({
    ...freePage,
    pathname: "/education/quiz-intro",
    pageKind: "quiz_intro",
  });
  assert.equal(intro.eligible, true);
  assert.equal(intro.allowAutoAds, false);
  assert.deepEqual(intro.manualPlacements, ["quiz_intro"]);

  const result = policy.evaluateAdsEligibility({
    ...freePage,
    pathname: "/education/quiz-result",
    pageKind: "quiz_result",
  });
  assert.equal(result.eligible, true);
  assert.equal(result.allowAutoAds, false);
  assert.deepEqual(result.manualPlacements, ["quiz_result"]);
});

test("script loading requires both runtime configuration and an eligible decision", () => {
  const eligible = policy.evaluateAdsEligibility(freePage);
  assert.equal(
    policy.canLoadAdSense(eligible, {
      enabled: true,
      clientId: "ca-pub-1234567890123456",
    }),
    true,
  );
  assert.equal(
    policy.canLoadAdSense(eligible, {
      enabled: false,
      clientId: "ca-pub-1234567890123456",
    }),
    false,
  );
  assert.equal(
    policy.canLoadAdSense(eligible, { enabled: true, clientId: "pub-1234567890123456" }),
    false,
  );
});

test("verification and component foundations remain conditional and unmounted", () => {
  const seo = readFileSync("src/lib/seo.ts", "utf8");
  const adsRoute = readFileSync("src/app/ads.txt/route.ts", "utf8");
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const provider = readFileSync("src/components/ads/ads-provider.tsx", "utf8");
  const envExample = readFileSync(".env.example", "utf8");

  assert.match(seo, /google-adsense-account/);
  assert.match(seo, /adsenseIdentity\.clientId/);
  assert.match(adsRoute, /getAdsTxtLine\(identity\)/);
  assert.match(adsRoute, /status:\s*404/);
  assert.match(provider, /export function AdSenseLoader/);
  assert.match(provider, /!context\?\.canLoad\s*\|\|\s*!context\.runtime\.clientId/);
  assert.doesNotMatch(layout, /AdsProvider|AdSenseLoader|googlesyndication/);
  assert.match(envExample, /^ADSENSE_ENABLED=false$/m);
  assert.match(envExample, /^ADSENSE_PUBLISHER_ID=$/m);
});

test("ads.txt and metadata emit their distinct forms only for a valid publisher ID", async () => {
  const missingRoute = moduleLoader({}, { process: { env: {} } })(
    "src/app/ads.txt/route.ts",
  );
  const missingResponse = await missingRoute.GET();
  assert.equal(missingResponse.status, 404);

  const env = {
    ADSENSE_ENABLED: "false",
    ADSENSE_PUBLISHER_ID: "pub-1234567890123456",
  };
  const configuredRoute = moduleLoader({}, { process: { env } })(
    "src/app/ads.txt/route.ts",
  );
  const configuredResponse = await configuredRoute.GET();
  assert.equal(configuredResponse.status, 200);
  assert.equal(
    await configuredResponse.text(),
    "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n",
  );

  const seo = moduleLoader(
    { "@/lib/prisma": { prisma: {} } },
    { process: { env } },
  )("src/lib/seo.ts");
  assert.equal(
    seo.baseMetadata().other["google-adsense-account"],
    "ca-pub-1234567890123456",
  );
});
