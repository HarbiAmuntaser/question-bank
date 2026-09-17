import { z } from "zod";
import { normalizeEmail, PASSWORD_MIN_LENGTH, PASSWORD_MAX_BYTES } from "@/lib/auth-policy";

export const emailSchema = z.string().max(254).transform(normalizeEmail).pipe(z.string().email());
export const newPasswordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(72)
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, "password_too_long")
  .refine((value) => value.trim().length >= PASSWORD_MIN_LENGTH, "password_too_short");
const callbackUrl = z.string().max(2048).optional();
const passwordPair = {
  password: newPasswordSchema,
  confirmPassword: z.string().max(72),
};
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80), email: emailSchema, ...passwordPair, callbackUrl,
}).strict().refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "password_mismatch" });
export const emailRequestSchema = z.object({ email: emailSchema, callbackUrl }).strict();
const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const verifyEmailSchema = z.object({ token, password: z.string().min(1).max(256) }).strict();
export const resetPasswordSchema = z.object({ token, ...passwordPair }).strict()
  .refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "password_mismatch" });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(256) });
