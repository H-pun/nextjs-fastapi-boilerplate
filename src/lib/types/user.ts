import type { DefaultSession } from "next-auth";
import z from "zod";
import { PaginationQuery } from "./pagination";

export const userSchema = z.object({
  id: z.string().uuid().nullish(),
  identifier: z.string().min(1, "Identifier is required").optional(),
  name: z.string().min(1, "Name is required").optional(),
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address").or(z.literal("")),
  phone: z.string().or(z.literal("")), // simplified e164 validation for now
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .optional()
    .or(z.literal("")),
  roleId: z.string().uuid().optional(),
});

export const changeRoleSchema = z.object({
  roleId: z.string().uuid(),
});

export const passwordSchema = z
  .object({
    oldPassword: z
      .string()
      .min(8, "Current password must be at least 8 characters long"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export interface GetUserQuery extends PaginationQuery {
  updatedWithin?: number;
  roleId?: string;
}

export interface RoleData {
  id: string;
  name: string;
  slug: string;
}

export interface UserData {
  id: string;
  identifier: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: RoleData;
  avatar?: string;
  cohort?: number;
  accessToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type LoginForm = z.infer<typeof loginSchema>;
export type UserForm = z.infer<typeof userSchema>;
export type PasswordForm = z.infer<typeof passwordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type ChangeRoleForm = z.infer<typeof changeRoleSchema>;

declare module "next-auth" {
  interface Session {
    user: UserData & DefaultSession["user"];
    scopes: string[];
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user: UserData;
    scopes: string[];
    role: string;
  }
}
