import type { Metadata } from "next";

export const BLOG_TOPIC_INDEX_MIN_POSTS = 2;

export type SearchIndexingMode = "blog_only" | "full";

type RobotsOverride = {
  noindex?: boolean | null;
  nofollow?: boolean | null;
};

type EducationPageRobotsOptions = {
  indexable?: boolean;
  requireSeo?: boolean;
};

export function getSearchIndexingMode(): SearchIndexingMode {
  return process.env.SEARCH_INDEXING_MODE === "full" ? "full" : "blog_only";
}

export function isBlogOnlySearchIndexing() {
  return getSearchIndexingMode() === "blog_only";
}

export function educationPageRobots(
  seo?: RobotsOverride | null,
  options: EducationPageRobotsOptions = {},
): NonNullable<Metadata["robots"]> {
  const hasRequiredSeo = !options.requireSeo || Boolean(seo);
  const isEligible = options.indexable !== false && hasRequiredSeo;

  return {
    index: isBlogOnlySearchIndexing() ? false : isEligible && !seo?.noindex,
    follow: !seo?.nofollow,
  };
}

export function blogTopicRobots(
  publishedPostCount: number,
  seo?: RobotsOverride | null,
): NonNullable<Metadata["robots"]> {
  return {
    index: publishedPostCount >= BLOG_TOPIC_INDEX_MIN_POSTS && !seo?.noindex,
    follow: !seo?.nofollow,
  };
}
