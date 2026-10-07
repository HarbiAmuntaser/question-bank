export type AdsPageKind =
  | "home"
  | "blog_index"
  | "blog_article"
  | "institution_listing"
  | "institution_detail"
  | "college_detail"
  | "major_detail"
  | "subject_detail"
  | "chapter_detail"
  | "quiz_intro"
  | "quiz_play"
  | "quiz_result"
  | "targeted_review"
  | "static_content"
  | "admin"
  | "auth"
  | "account"
  | "payment"
  | "unknown";

export type AdsContentAccess = "free" | "paid" | "mixed" | "unknown";
export type ManualAdPlacement = "content_inline" | "quiz_intro" | "quiz_result";

export type AdsEligibilityInput = {
  pathname: string;
  pageKind: AdsPageKind;
  contentAccess: AdsContentAccess;
  published: boolean;
  hasPublisherContent: boolean;
};

export type AdsEligibilityDecision = {
  eligible: boolean;
  reason:
    | "eligible"
    | "restricted_route"
    | "restricted_page_kind"
    | "unpublished"
    | "insufficient_publisher_content"
    | "paid_or_mixed_content"
    | "unknown_content_access"
    | "unsupported_page_kind";
  allowAutoAds: boolean;
  manualPlacements: ManualAdPlacement[];
};

const RESTRICTED_PATH_PREFIXES = [
  "/admin",
  "/api",
  "/auth",
  "/account",
  "/dashboard",
  "/payment",
  "/checkout",
  "/orders",
  "/subscriptions",
] as const;

const RESTRICTED_PAGE_KINDS = new Set<AdsPageKind>([
  "admin",
  "auth",
  "account",
  "payment",
  "quiz_play",
  "targeted_review",
  "static_content",
  "unknown",
]);

const AUTO_ADS_PAGE_KINDS = new Set<AdsPageKind>([
  "home",
  "blog_index",
  "blog_article",
  "institution_listing",
  "institution_detail",
  "college_detail",
  "major_detail",
]);

function blocked(reason: AdsEligibilityDecision["reason"]): AdsEligibilityDecision {
  return { eligible: false, reason, allowAutoAds: false, manualPlacements: [] };
}

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function evaluateAdsEligibility(input: AdsEligibilityInput): AdsEligibilityDecision {
  if (RESTRICTED_PATH_PREFIXES.some((prefix) => matchesPrefix(input.pathname, prefix))) {
    return blocked("restricted_route");
  }
  if (RESTRICTED_PAGE_KINDS.has(input.pageKind)) return blocked("restricted_page_kind");
  if (!input.published) return blocked("unpublished");
  if (!input.hasPublisherContent) return blocked("insufficient_publisher_content");
  if (input.contentAccess === "unknown") return blocked("unknown_content_access");
  if (input.contentAccess !== "free") return blocked("paid_or_mixed_content");

  if (input.pageKind === "quiz_intro") {
    return {
      eligible: true,
      reason: "eligible",
      allowAutoAds: false,
      manualPlacements: ["quiz_intro"],
    };
  }
  if (input.pageKind === "quiz_result") {
    return {
      eligible: true,
      reason: "eligible",
      allowAutoAds: false,
      manualPlacements: ["quiz_result"],
    };
  }
  if (input.pageKind === "subject_detail" || input.pageKind === "chapter_detail") {
    return {
      eligible: true,
      reason: "eligible",
      allowAutoAds: false,
      manualPlacements: ["content_inline"],
    };
  }
  if (AUTO_ADS_PAGE_KINDS.has(input.pageKind)) {
    return {
      eligible: true,
      reason: "eligible",
      allowAutoAds: true,
      manualPlacements: ["content_inline"],
    };
  }

  return blocked("unsupported_page_kind");
}

export function canLoadAdSense(
  decision: AdsEligibilityDecision,
  runtime: { enabled: boolean; clientId: string | null },
) {
  return Boolean(
    runtime.enabled &&
      /^ca-pub-\d{16}$/.test(runtime.clientId ?? "") &&
      decision.eligible &&
      (decision.allowAutoAds || decision.manualPlacements.length > 0),
  );
}
