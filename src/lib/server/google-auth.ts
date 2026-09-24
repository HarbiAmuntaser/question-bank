import "server-only";

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";

import { normalizeEmail } from "@/lib/auth-policy";
import { prisma } from "@/lib/prisma";
import {
  googleAuthConfig,
  googleAuthConfigured,
  studentRegistrationEnabled,
} from "@/lib/server/auth-config";
import { emailSchema } from "@/validations/student-auth";

type GoogleSignInInput = {
  account?: { provider?: string; providerAccountId?: string } | null;
  profile?: unknown;
};

function verifiedGoogleEmail(profile: unknown): string | null {
  if (!profile || typeof profile !== "object") return null;
  const value = profile as Partial<GoogleProfile>;
  if (value.email_verified !== true) return null;
  const parsed = emailSchema.safeParse(value.email);
  return parsed.success ? parsed.data : null;
}

export function createGoogleProvider() {
  const config = googleAuthConfig();
  if (!config) return null;

  const authorization = { params: { scope: "openid email" } };
  const mapProfile = (profile: GoogleProfile) => {
    const email = verifiedGoogleEmail(profile);
    if (!email || !profile.sub) throw new Error("google_profile_not_verified");
    return {
      id: profile.sub,
      email,
      name: null,
      image: null,
      role: "student" as const,
      sessionVersion: 0,
      emailVerified: null,
    };
  };
  const provider = GoogleProvider({
    ...config,
    authorization,
    profile: mapProfile,
  });

  // Keep the provider's raw definition aligned with the options NextAuth merges at runtime.
  return { ...provider, authorization, profile: mapProfile };
}

export function createStudentAuthAdapter(): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,
    async createUser(data: Omit<AdapterUser, "id">) {
      if (!googleAuthConfigured() || !studentRegistrationEnabled()) {
        throw new Error("google_registration_closed");
      }
      const email = emailSchema.parse(data.email);
      return prisma.user.create({
        data: {
          email,
          normalizedEmail: email,
          password: null,
          name: null,
          image: null,
          emailVerified: new Date(),
          role: "student",
          isActive: true,
          sessionVersion: 0,
        },
      });
    },
    getUserByEmail(email) {
      return prisma.user.findUnique({ where: { normalizedEmail: normalizeEmail(email) } });
    },
    async linkAccount(account: AdapterAccount) {
      if (account.provider !== "google") throw new Error("oauth_provider_not_allowed");
      const owner = await prisma.user.findUnique({
        where: { id: account.userId },
        select: { role: true, isActive: true, emailVerified: true, password: true },
      });
      if (!owner?.isActive || owner.role !== "student" || !owner.emailVerified || owner.password !== null) {
        throw new Error("google_account_link_not_allowed");
      }
      const existingAccount = await prisma.account.findFirst({
        where: { userId: account.userId },
        select: { id: true },
      });
      if (existingAccount) throw new Error("google_account_link_not_allowed");
      return prisma.account.create({
        data: {
          userId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
      });
    },
  };
}

export async function allowGoogleStudentSignIn({ account, profile }: GoogleSignInInput): Promise<boolean> {
  if (account?.provider !== "google") return true;
  if (!googleAuthConfigured() || !account.providerAccountId) return false;
  const email = verifiedGoogleEmail(profile);
  if (!email) return false;

  const linked = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: account.providerAccountId } },
    select: { user: { select: { role: true, isActive: true, emailVerified: true } } },
  });
  if (linked) return linked.user.role === "student" && linked.user.isActive && Boolean(linked.user.emailVerified);

  // Let NextAuth detect an existing normalized email and return OAuthAccountNotLinked.
  // Its default protection remains enabled; allowDangerousEmailAccountLinking is never set.
  const existing = await prisma.user.findUnique({ where: { normalizedEmail: email }, select: { id: true } });
  if (existing) return true;
  return studentRegistrationEnabled();
}
