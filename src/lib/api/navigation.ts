import axios from "@/lib/axios";
import type { Navigation, NavigationForm } from "@/lib/types/navigation";

/** The sidebar: only the menus this user's scopes allow. */
export const getMyNavigation = async () => {
  try {
    const response = await axios.get<Navigation[]>("/navigation/me");
    return response.data;
  } catch (error) {
    console.error("Error fetching navigation:", error);
    return [];
  }
};

/** The whole tree, for the menu editor. Needs `navigation:manage`. */
export const getNavigation = async () => {
  try {
    const response = await axios.get<Navigation[]>("/navigation");
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
