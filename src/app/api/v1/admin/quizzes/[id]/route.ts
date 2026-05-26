/* Fixed Next 15 params typing */

import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { revalidateTag } from "next/cache";
import { z } from "zod";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };
type RouteContext = {
  params: Promise<RouteParams>;
};

export async function GET(req: Request, { params }: RouteContext) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { questionOrder: "asc" },
        include: {
          question: {
            include: {
              options: true,
              chapter: {
                include: {
                  subject: { include: { major: { include: { university: true } } } },
                },
              },
            },
          },
        },
      },
      _count: { select: { attempts: true } },
    },
  });
  if (!quiz) return json({ error: "not_found" }, 404);
  return json({ data: quiz }, 200);
}

const updateQuizSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  timeLimit: z.coerce.number().int().min(1).max(180).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: RouteContext) {
  const { id } = await params;

  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body = await req.json().catch(() => null);
  const parsed = updateQuizSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const updated = await prisma.quiz.update({
    where: { id },
    data: parsed.data,
  });

  revalidateTag("quizzes");
  return json({ data: updated, message: "تم تحديث الاختبار بنجاح" }, 200);
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { id } = await params;

  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  await prisma.quiz.delete({ where: { id } });
  revalidateTag("quizzes");
  return json({ message: "تم حذف الاختبار" }, 200);
}
