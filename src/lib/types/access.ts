import z from "zod";

export interface Scope {
  id: string;
  key: string;
  label: string;
  description?: string;
  order: number;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  order: number;
  scopes: Scope[];
}

export const createRoleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Slug is required").regex(/^[A-Z0-9_]+$/, "Only uppercase letters, numbers, and underscores are allowed"),
});

export type CreateRoleForm = z.infer<typeof createRoleSchema>;
