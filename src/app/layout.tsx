// ============================================================================
// file: src/app/layout.tsx  (مُحدّث ليستخدم lib/seo بدون أخطاء)
// ============================================================================
import type React from "react";
import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { baseMetadata, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { SpeedInsights } from "@vercel/speed-insights/next"; // ✅ أضف هذا


const cairo = Cairo({ subsets: ["arabic", "latin"], display: "swap" });

export const metadata: Metadata = {
  ...baseMetadata(),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={cairo.className}>
        {/* JSON-LD: Organization + Website */}
        <script
          type="application/ld+json"
          // يوضّح هوية الموقع لمحركات البحث
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
                {/* ✅ Speed Insights هنا */}
          <SpeedInsights />
        </ThemeProvider>
        
      </body>
    </html>
  );
}
