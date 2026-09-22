import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/admin-permissions";
import { safeAuthRedirect, SESSION_MAX_AGE, type AuthPortal } from "@/lib/auth-policy";
import { loginSchema } from "@/validations/student-auth";
import { comparePassword } from "@/lib/server/auth-password";
import { limitLogin } from "@/lib/server/auth-rate-limit";

function credentialsProvider(portal: AuthPortal) {
  return CredentialsProvider({
    id: `${portal}-credentials`, name: portal,
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    async authorize(credentials, req) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers ?? {})) if (typeof value === "string") headers.set(key, value);
      try {
        await limitLogin(headers, parsed.data.email);
        const user = await prisma.user.findUnique({ where: { normalizedEmail: parsed.data.email } });
        const validPassword = await comparePassword(parsed.data.password, user?.password);
        if (!user?.isActive || !validPassword) return null;
        if (portal === "admin" ? !isAdminRole(user.role) : user.role !== "student" || !user.emailVerified) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, sessionVersion: user.sessionVersion,
          emailVerified: user.emailVerified?.toISOString() ?? null };
      } catch {
        return null;
      }
    },
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma), secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE }, jwt: { maxAge: SESSION_MAX_AGE },
  providers: [credentialsProvider("student"), credentialsProvider("admin")],
  pages: { signIn: "/auth/signin" },
  callbacks: {
    async redirect({ url, baseUrl }) { return safeAuthRedirect(url, baseUrl); },
    async jwt({ token, user }) {
      if (user) return { ...token, sub: user.id, role: user.role, sessionVersion: user.sessionVersion, emailVerified: user.emailVerified };
      // Tokens issued before P2 require one fresh sign-in.
      if (!token.sub || !Number.isInteger(token.sessionVersion)) return {};
      const current = await prisma.user.findUnique({ where: { id: token.sub }, select: {
        role: true, isActive: true, sessionVersion: true, emailVerified: true, name: true, email: true,
      } });
      if (!current?.isActive || current.sessionVersion !== token.sessionVersion || current.role !== token.role ||
          (current.role === "student" && !current.emailVerified)) return {};
      return { ...token, name: current.name, email: current.email, emailVerified: current.emailVerified?.toISOString() ?? null };
    },
    async session({ session, token }) {
      session.user = { ...session.user, id: token.sub ?? "", role: token.role,
        sessionVersion: token.sessionVersion, emailVerified: token.emailVerified ?? null };
      return session;
    },
  },
};
