import { prisma } from "@/lib/prisma";
import { permanentRedirect, notFound } from "next/navigation";

export default async function LegacyUniversityById({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // جد سلوغ الجامعة، وإن لم يوجد نرمي 404
  const seo = await prisma.seoMeta.findFirst({
    where: { ownerType: "university", ownerId: id, locale: "ar" },
    select: { slug: true },
  });

  if (!seo?.slug) return notFound();

  permanentRedirect(`/universities/${seo.slug}`);
}