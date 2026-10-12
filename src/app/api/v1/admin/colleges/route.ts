import { Prisma } from "@prisma/client";

import { adminAuthResponse, verifyAdmin } from "@/lib/admin-auth";
import { revalidateCollegeCache } from "@/lib/cache-invalidation";
import { bad, json } from "@/lib/server/admin-http";
import {
  createCollege,
  EducationStructureError,
} from "@/lib/server/education-structure";
import { createCollegeSchema } from "@/validations/college";
import { AdminListQueryError, listAdminColleges } from "@/lib/server/admin-content-lists";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await verifyAdmin(req, "colleges:read");
  if (!auth.ok) return adminAuthResponse(auth);

  const url = new URL(req.url);
  try {
    return json(await listAdminColleges(Object.fromEntries(url.searchParams.entries())));
  } catch (error) {
    if (!(error instanceof AdminListQueryError)) throw error;
    return bad("bad_query_params");
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req, "colleges:write");
  if (!auth.ok) return adminAuthResponse(auth);

  const parsed = createCollegeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  try {
    const college = await createCollege({ ...parsed.data, createdBy: auth.userId });
    revalidateCollegeCache({ id: college.id, universityId: college.universityId });
    return json({ data: college }, 201);
  } catch (error) {
    if (error instanceof EducationStructureError) return bad(error.code, undefined, error.status);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return bad("duplicate_college_identity_for_university", { fields: ["slug", "code"] }, 409);
    }
    throw error;
  }
}
