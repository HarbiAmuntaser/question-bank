// file: src/app/[cc]/[type]/layout.tsx

/**
 * Layout لمسارات /{cc}/{type}
 * - Server Component افتراضياً
 * - لا نمرر params حالياً لأن الهيدر يقرأ المسار من pathname (Client).
 * - لاحقاً يمكن وضع Providers أو Context هنا لو احتجنا.
 */

export default function RegionTypeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
