import { z } from "zod";

export const userRoleEnum = z.enum(["admin", "editor", "moderator"]);

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "name_required").optional().nullable(),
  email: z.string().email("invalid_email"),
  password: z.string().min(6, "min_6"),
  role: userRoleEnum.default("admin"),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional().nullable(),
  email: z.string().email().optional(),
  // كلمة المرور اختيارية عند التعديل
  password: z.string().min(6).optional(),
  role: userRoleEnum.optional(),
  isActive: z.boolean().optional(),
});
