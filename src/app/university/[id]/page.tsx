import { prisma } from "@/lib/prisma";
import { permanentRedirect, notFound } from "next/navigation";
import { isPublicUniversityId } from "@/lib/server/public-content-visibility";

export default async function LegacyUniversityById({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!(await isPublicUniversityId(id))) return notFound();

  // جد سلوغ الجامعة، وإن لم يوجد نرمي 404
  const seo = await prisma.seoMeta.findFirst({
    where: { ownerType: "university", ownerId: id, locale: "ar" },
    select: { slug: true },
  });

  if (!seo?.slug) return notFound();

  permanentRedirect(`/universities/${seo.slug}`);
}
