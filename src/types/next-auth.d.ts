import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import type { UserRole } from "@prisma/client";


declare module "next-auth" {
interface Session {
user: { id: string; role?: UserRole; sessionVersion?: number; emailVerified: string | null } & DefaultSession["user"];
}
interface User extends DefaultUser {
role: UserRole;
sessionVersion: number;
emailVerified: string | Date | null;
}
}


declare module "next-auth/jwt" {
interface JWT extends DefaultJWT {
role?: UserRole;
sessionVersion?: number;
emailVerified?: string | null;
}
}


export {};
