import axios from "@/lib/axios";
import type { RoleData } from "@/lib/types/user";

export const getRoles = async () => {
  try {
    const response = await axios.get<RoleData[]>("/role");
    return response.data;
  } catch (error) {
    console.error("Error fetching roles:", error);
    return [];
  }
};
