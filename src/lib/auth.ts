import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";


export const authOptions: NextAuthOptions = {
adapter: PrismaAdapter(prisma),
session: { strategy: "jwt" },
secret: process.env.NEXTAUTH_SECRET,
providers: [
CredentialsProvider({
name: "credentials",
credentials: {
email: { label: "Email", type: "email" },
password: { label: "Password", type: "password" },
},
async authorize(credentials) {
if (!credentials?.email || !credentials?.password) return null;
const user = await prisma.user.findUnique({ where: { email: credentials.email } });
if (!user || !user.isActive) return null;
const ok = await bcrypt.compare(credentials.password, user.password);
if (!ok) return null;
return { id: user.id, email: user.email, name: user.name ?? undefined, role: user.role } as {
id: string; email: string; name?: string; role: string;
};
},
}),
],
pages: { signIn: "/auth/signin" },
callbacks: {
async jwt({ token, user }) {
if (user) {
// Persist role on token
(token as unknown as { role?: string }).role = (user as { role: string }).role;
}
return token;
},
async session({ session, token }) {
// Expose id + role on session.user
const t = token as unknown as { sub?: string; role?: string };
if (session.user) {
(session.user as { id?: string }).id = t.sub ?? "";
(session.user as { role?: string }).role = t.role ?? "";
}
return session;
},
},
};