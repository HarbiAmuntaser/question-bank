// src/app/admin/seo-meta/page.tsx
import { SeoMetaPageClient } from "@/components/admin/seo/SeoMetaPageClient";
import { prisma } from "@/lib/prisma";

async function getInitialSeoMeta() {
  const page = 1;
  const pageSize = 20;

  const [rows, total] = await Promise.all([
    prisma.seoMeta.findMany({
      skip: 0,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.seoMeta.count(),
  ]);

  // Dates from Prisma are normalized before crossing into the client component.
  return {
    rows: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export default async function SeoMetaPage() {
  const initialData = await getInitialSeoMeta();

  return <SeoMetaPageClient initialData={initialData} />;
}
