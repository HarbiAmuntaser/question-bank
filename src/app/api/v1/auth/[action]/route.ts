import { studentAuthPost } from "@/lib/server/student-auth-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request, context: { params: Promise<{ action: string }> }) {
  return studentAuthPost(req, (await context.params).action);
}
