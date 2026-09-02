import type { DefaultSession } from "next-auth";
import z from "zod";
import { PaginationQuery } from "./pagination";
import type { Role } from "./access";

const usernamePattern = /^[a-zA-Z0-9._-]+$/;

export const userSchema = z.object({
  // guid, not uuid: seeded ids (11111111-1111-1111-1111-…) skip RFC variant bits.
  id: z.guid().nullish(),
  roleIds: z.array(z.guid()).min(1, "Pick at least one role"),
  identifier: z.string().min(1, "Identifier is required"),
  name: z.string().min(1, "Name is required"),
  // Every account is reached by its address; a username is optional on top.
  email: z.email("Email is required"),
  username: z.union([
    z.literal(""),
    z
      .string()
      .regex(
        usernamePattern,
        "Username may only contain letters, numbers, dots, dashes, and underscores"
      ),
  ]),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .optional()
    .or(z.literal("")),
});

export const changeRoleSchema = z.object({
  roleIds: z.array(z.guid()).min(1, "Pick at least one role"),
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
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export interface GetUserQuery extends PaginationQuery {
  updatedWithin?: number;
  roleId?: string;
}

export interface UserData {
  id: string;
  /** Null until an admin assigns one — no provider issues these. */
  identifier?: string;
  name: string;
  /** Null until the person picks one. Provider sign-ins arrive without it. */
  username?: string;
  /** Always present — it is how every account is reached. */
  email: string;
  roles: Role[];
  avatar?: string;
  accessToken?: string;
  createdAt: Date;
  updatedAt: Date;
  /** Server group bucket when the list request used `groupBy`. */
  groupKey?: string | null;
}

/** Every scope a user holds, across all their roles. Mirrors `User.scope_keys`
 *  on the backend — but for showing and hiding UI only. The API enforces its
 *  own checks, so hiding a button here is never the thing keeping anyone out. */
export function scopeKeys(user?: Pick<UserData, "roles">): Set<string> {
  return new Set(user?.roles?.flatMap((role) => role.scopes.map((s) => s.key)) ?? []);
}

/** Whether a user holds the admin scope used for `/dashboard/admin/*` routes. */
export function hasAdminScope(user?: Pick<UserData, "roles">): boolean {
  return scopeKeys(user).has("user:manage");
}

export type LoginForm = z.infer<typeof loginSchema>;
export type UserForm = z.infer<typeof userSchema>;
export type PasswordForm = z.infer<typeof passwordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type ChangeRoleForm = z.infer<typeof changeRoleSchema>;

// Scopes are not stored on the session. They ride along inside `user.roles`,
// which the API refreshes on login and on `useSession().update()`, so there is
// no second copy to go stale against the database.
declare module "next-auth" {
  interface Session {
    user: UserData & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user: UserData;
  }
}
