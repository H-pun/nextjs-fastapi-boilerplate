import z from "zod";

export interface Scope {
  id: string;
  key: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  scopes: Scope[];
}

export const createRoleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export type CreateRoleForm = z.infer<typeof createRoleSchema>;

