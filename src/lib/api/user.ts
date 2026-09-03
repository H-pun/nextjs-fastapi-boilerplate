import axios from "@/lib/axios";

import type {
  UserData,
  GetUserQuery,
  UserForm,
  PasswordForm,
  ResetPasswordForm,
  ChangeRoleForm,
} from "@/lib/types/user";
import { Pagination } from "@/lib/types/pagination";

export const getUsers = async (params: GetUserQuery) => {
  try {
    const response = await axios.get<Pagination<UserData>>("/user", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching:", error);
  }
};

export const getCurrentUser = async () => {
  const response = await axios.get<UserData>("/user/me");
  return response.data;
};

export const createUser = async (data: UserForm) => {
  const response = await axios.post("/user", {
    identifier: data.identifier,
    name: data.name,
    username: data.username,
    email: data.email ?? "",
    password: data.password,
    roleIds: data.roleIds,
  });
  return response.data;
};

export const updateUser = async (data: UserForm) => {
  const response = await axios.put(`/user/${data.id}`, {
    identifier: data.identifier,
    name: data.name,
    username: data.username,
    email: data.email ?? "",
    roleIds: data.roleIds,
  });
  return response.data;
};

export const changeRole = async (id: string, data: ChangeRoleForm) => {
  const response = await axios.patch(`/user/${id}/role`, data);
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await axios.delete(`/user/${id}`);
  return response.data;
};

export const resetPassword = async (id: string, data: ResetPasswordForm) => {
  const response = await axios.put(`/user/${id}/reset-password`, data);
  return response.data;
};

export const updatePassword = async (data: PasswordForm) => {
  const response = await axios.put("/user/password", data);
  return response.data;
};

export const updateAvatar = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const response = await axios.patch<{ avatar: string }>("/user/me/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
