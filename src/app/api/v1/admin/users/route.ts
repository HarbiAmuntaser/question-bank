import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { unstable_cache, revalidateTag } from "next/cache";
import { createUserSchema } from "@/validations/user";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const listUsersCached = unstable_cache(
  async () => {
    const rows = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true, image: true,
      },
    });
    return { data: rows };
  },
  ["admin-users-list"],
  { revalidate: 3600, tags: ["users"] }
);

export async function GET() {
  try {
    const payload = await listUsersCached();
    return json(payload, 200, { "cache-control": "public, s-maxage=3600, stale-while-revalidate=60" });
  } catch {
    return bad("bad_query_params");
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

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
