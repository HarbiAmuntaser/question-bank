// file: src/app/[cc]/[type]/layout.tsx

/**
 * Layout لمسارات /{cc}/{type}
 * - Server Component افتراضياً
 * - لا نمرر params حالياً لأن الهيدر يقرأ المسار من pathname (Client).
 * - لاحقاً يمكن وضع Providers أو Context هنا لو احتجنا.
 */

import { notFound } from "next/navigation";

import { isSupportedType } from "@/lib/route-helpers";

export default async function RegionTypeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ cc: string; type: string }>;
}) {
  const { cc, type } = await params;
  if (!isSupportedType(type, cc)) notFound();

  return children;
}
