import { z } from "zod";
import { emailSchema, newPasswordSchema } from "@/validations/student-auth";

export const userRoleEnum = z.enum(["admin", "editor", "moderator", "student"]);

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "name_required").optional().nullable(),
  email: emailSchema,
  password: newPasswordSchema,
  role: userRoleEnum,
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional().nullable(),
  email: emailSchema.optional(),
  // كلمة المرور اختيارية عند التعديل
  password: newPasswordSchema.optional(),
  role: userRoleEnum.optional(),
  isActive: z.boolean().optional(),
});
