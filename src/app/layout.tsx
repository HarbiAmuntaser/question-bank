import type React from "react";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Cairo } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { SITE } from "@/lib/site.config";
import { baseMetadata, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], display: "swap" });

export const metadata: Metadata = {
  ...baseMetadata(),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: SITE.THEME_COLOR_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: SITE.THEME_COLOR_DARK },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={cairo.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <SpeedInsights />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
