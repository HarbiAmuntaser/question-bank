import "server-only";

import { prisma } from "@/lib/prisma";

export async function getCollegeSeoSlug(collegeId: string) {
  const college = await prisma.college.findUnique({
    where: { id: collegeId },
    select: { slug: true },
  });
  return college?.slug.trim() || null;
}
