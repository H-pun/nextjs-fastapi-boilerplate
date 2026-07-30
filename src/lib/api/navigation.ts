import axios from "@/lib/axios";
import type { Navigation, NavigationForm } from "@/lib/types/navigation";

// TODO: Implement API for default role navigation
export const getNavigation = async (role?: number | string) => {
  try {
    const response = await axios.get<Navigation[]>("/navigation", {
      params: { role },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching navigation:", error);
    return [];
  }
};

export const saveNavigation = async (data: NavigationForm) => {
  try {
    const response = await axios.post("/navigation", data);
    return response.data;
  } catch (error) {
    console.error("Error updating navigation:", error);
    throw error;
  }
};
