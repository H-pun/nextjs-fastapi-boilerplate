import axios from "@/lib/axios";
import type { Role, Scope, CreateRoleForm } from "@/lib/types/access";

export const getRoles = async () => {
  try {
    const response = await axios.get<Role[]>("/role");
    return response.data;
  } catch (error) {
    console.error("Error fetching roles:", error);
    return [];
  }
};

export const getScopes = async () => {
  try {
    const response = await axios.get<Scope[]>("/role/scopes");
    return response.data;
  } catch (error) {
    console.error("Error fetching scopes:", error);
    return [];
  }
};

export const createRole = async (
  data: CreateRoleForm & { description?: string | null }
) => {
  const response = await axios.post<Role>("/role", data);
  return response.data;
};

export const updateRole = async (
  id: string,
  data: Partial<CreateRoleForm> & { description?: string | null }
) => {
  const response = await axios.patch<Role>(`/role/${id}`, data);
  return response.data;
};

export const deleteRole = async (id: string) => {
  const response = await axios.delete(`/role/${id}`);
  return response.data;
};

export const setRoleScopes = async (id: string, scope_ids: string[]) => {
  const response = await axios.put<Role>(`/role/${id}/scopes`, { scope_ids });
  return response.data;
};
