import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/server/admin-http";
import { verifyAdmin, adminAuthResponse } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateTag } from "next/cache";
import { createUserSchema } from "@/validations/user";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const listUsers = async () => {
    const rows = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true, image: true,
      },
    });
    return { data: rows };
  };

export async function GET(req: Request) {
  const auth = await verifyAdmin(req, "users:manage");
  if (!auth.ok) return adminAuthResponse(auth);

  try {
    const payload = await listUsers();
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
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return bad("email_exists");

  const hashed = await bcrypt.hash(parsed.data.password, 10);

  const created = await prisma.user.create({
    data: {
      name: parsed.data.name ?? null,
      email: parsed.data.email,
      password: hashed,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  revalidateTag("users");
  return json({ data: created, message: "تم إنشاء المستخدم" }, 201);
}
