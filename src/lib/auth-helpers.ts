import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


export async function getCurrentSession() {
return getServerSession(authOptions);
}


export async function getCurrentUser() {
const session = await getCurrentSession();
if (!session?.user?.id) return null;
return { id: session.user.id, role: (session.user as { role?: string }).role ?? "" };
}