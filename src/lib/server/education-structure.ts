import "server-only";

import {
  Prisma,
  type College,
  type InstitutionType,
  type Major,
  type University,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { validateCollegeSlug } from "@/lib/college-slugs";

export class EducationStructureError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 409,
  ) {
    super(code);
  }
}

type StructureDb = Pick<Prisma.TransactionClient, "college" | "major" | "university">;
const STRUCTURE_TRANSACTION_RETRIES = 3;

async function structureTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= STRUCTURE_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        attempt === STRUCTURE_TRANSACTION_RETRIES ||
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2034"
      ) {
        throw error;
      }
    }
  }
  throw new EducationStructureError("education_structure_conflict");
}

export type MajorPlacementInput = {
  universityId: string;
  collegeId: string | null;
};

export async function validateMajorPlacement(db: StructureDb, input: MajorPlacementInput) {
  const university = await db.university.findUnique({
    where: { id: input.universityId },
    select: { id: true, institutionType: true },
  });
  if (!university) throw new EducationStructureError("university_not_found", 404);

  if (!input.collegeId) return;
  if (university.institutionType !== "university") {
    throw new EducationStructureError("college_not_allowed_for_institution");
  }

  const college = await db.college.findUnique({
    where: { id: input.collegeId },
    select: { universityId: true },
  });
  if (!college) throw new EducationStructureError("college_not_found", 404);
  if (college.universityId !== university.id) {
    throw new EducationStructureError("college_university_mismatch");
  }
}

type CreateMajorInput = {
  universityId: string;
  collegeId: string | null;
  name: string;
  code: string | null;
  degreeType: string | null;
  durationYears: number | null;
  isActive: boolean;
  createdBy: string;
};

export async function createMajorWithPlacement(input: CreateMajorInput): Promise<Major> {
  return structureTransaction(async (tx) => {
    await validateMajorPlacement(tx, input);
    return tx.major.create({ data: input });
  });
}

type UpdateMajorInput = Partial<Omit<CreateMajorInput, "createdBy">>;

export async function updateMajorWithPlacement(id: string, input: UpdateMajorInput): Promise<Major> {
  return structureTransaction(async (tx) => {
    const current = await tx.major.findUnique({
      where: { id },
      select: { universityId: true, collegeId: true },
    });
    if (!current) throw new EducationStructureError("major_not_found", 404);

    const universityId = input.universityId ?? current.universityId;
    const collegeId = Object.prototype.hasOwnProperty.call(input, "collegeId")
      ? input.collegeId ?? null
      : current.collegeId;

    await validateMajorPlacement(tx, { universityId, collegeId });
    return tx.major.update({ where: { id }, data: input });
  });
}

async function requireUniversityOwner(db: StructureDb, universityId: string) {
  const university = await db.university.findUnique({
    where: { id: universityId },
    select: { institutionType: true },
  });
  if (!university) throw new EducationStructureError("university_not_found", 404);
  if (university.institutionType !== "university") {
    throw new EducationStructureError("college_requires_university");
  }
}

type CreateCollegeInput = {
  universityId: string;
  name: string;
  slug: string;
  code: string | null;
  isActive: boolean;
  createdBy: string;
};

function requireValidCollegeSlug(value: unknown) {
  const result = validateCollegeSlug(value);
  if (!result.ok) throw new EducationStructureError(result.error, 400);
  return result.slug;
}

export async function createCollege(input: CreateCollegeInput): Promise<College> {
  return structureTransaction(async (tx) => {
    await requireUniversityOwner(tx, input.universityId);
    return tx.college.create({ data: { ...input, slug: requireValidCollegeSlug(input.slug) } });
  });
}

type UpdateCollegeInput = Partial<Omit<CreateCollegeInput, "createdBy">>;

export async function updateCollege(id: string, input: UpdateCollegeInput): Promise<College> {
  return structureTransaction(async (tx) => {
    const current = await tx.college.findUnique({
      where: { id },
      select: { universityId: true, _count: { select: { majors: true } } },
    });
    if (!current) throw new EducationStructureError("college_not_found", 404);

    const universityId = input.universityId ?? current.universityId;
    await requireUniversityOwner(tx, universityId);
    if (universityId !== current.universityId && current._count.majors > 0) {
      throw new EducationStructureError("college_has_majors");
    }

    const data = Object.prototype.hasOwnProperty.call(input, "slug")
      ? { ...input, slug: requireValidCollegeSlug(input.slug) }
      : input;
    const updated = await tx.college.update({ where: { id }, data });
    if (Object.prototype.hasOwnProperty.call(data, "slug")) {
      await tx.seoMeta.updateMany({
        where: { ownerType: "college", ownerId: id },
        data: { slug: updated.slug },
      });
    }
    return updated;
  });
}

export async function deleteCollege(id: string): Promise<College> {
  return structureTransaction(async (tx) => {
    const college = await tx.college.findUnique({
      where: { id },
      select: { id: true, universityId: true, _count: { select: { majors: true } } },
    });
    if (!college) throw new EducationStructureError("college_not_found", 404);
    if (college._count.majors > 0) throw new EducationStructureError("college_has_majors");
    await tx.seoMeta.deleteMany({ where: { ownerType: "college", ownerId: college.id } });
    return tx.college.delete({ where: { id } });
  });
}

async function assertUniversityTypeChangeAllowed(
  db: StructureDb,
  universityId: string,
  nextType: InstitutionType,
) {
  if (nextType === "university") return;
  const collegeCount = await db.college.count({ where: { universityId } });
  if (collegeCount > 0) throw new EducationStructureError("university_has_colleges");
}

export async function updateUniversityWithStructure(
  id: string,
  nextType: InstitutionType,
  data: Prisma.UniversityUpdateInput,
): Promise<University> {
  return structureTransaction(async (tx) => {
    await assertUniversityTypeChangeAllowed(tx, id, nextType);
    return tx.university.update({ where: { id }, data });
  });
}
