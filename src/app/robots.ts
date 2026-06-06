import type { MetadataRoute } from "next";

const SITE_URL = "https://mustawak.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/api",
        "/api/",
        "/auth",
        "/auth/",
        "/dashboard",
        "/quiz/*/results",
        "/quiz/*/review",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
