import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { json, bad } from "@/lib/server/admin-http";
import { verifyAdmin, adminAuthResponse } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateTag } from "next/cache";
import { createUserSchema, userRoleEnum } from "@/validations/user";
import { hashPassword } from "@/lib/server/auth-password";

export const dynamic = "force-dynamic";

const listUsers = async (req: Request) => {
    const params = new URL(req.url).searchParams;
    const rawPage = Number(params.get("page") ?? 1);
    const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 100000) : 1;
    const query = (params.get("query") ?? "").trim().slice(0, 100);
    const role = userRoleEnum.safeParse(params.get("role"));
    const where: Prisma.UserWhereInput = {
      ...(role.success ? { role: role.data } : {}),
      ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { normalizedEmail: { contains: query.toLowerCase() } }] } : {}),
    };
    const rows = await prisma.user.findMany({
      where, skip: (page - 1) * 25, take: 26,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true, image: true,
      },
    });
    return { data: rows.slice(0, 25), page, hasMore: rows.length > 25 };
  };

export async function GET(req: Request) {
  const auth = await verifyAdmin(req, "users:manage");
  if (!auth.ok) return adminAuthResponse(auth);

  try {
    const payload = await listUsers(req);
    return json(payload, 200, { "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE });
  } catch {
    return bad("bad_query_params");
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req, "users:manage");
  if (!auth.ok) return adminAuthResponse(auth);

  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  // تأكد من عدم تكرار الإيميل
  const exists = await prisma.user.findUnique({ where: { normalizedEmail: parsed.data.email } });
  if (exists) return bad("email_exists");

  const hashed = await hashPassword(parsed.data.password);

  try {
  const created = await prisma.user.create({
    data: {
      name: parsed.data.name ?? null,
      email: parsed.data.email,
      normalizedEmail: parsed.data.email,
      password: hashed,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  revalidateTag("users");
  return json({ data: created, message: "تم إنشاء المستخدم" }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return bad("email_exists", undefined, 409);
    throw error;
  }
}
