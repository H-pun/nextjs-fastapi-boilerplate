import axios from "axios";
import { convertKeysToCamelCase, convertKeysToSnakeCase } from "@/lib/utils";
import { getSession, signOut } from "next-auth/react";

// Inisialisasi interceptor di sini
axios.interceptors.request.use(
  async (request) => {
    request.baseURL = "/api";
    const session = await getSession();
    if (session && session.user) {
      request.headers["Authorization"] = `Bearer ${session.user.accessToken}`;
    }
    if (request.data) request.data = convertKeysToSnakeCase(request.data);
    if (request.params) request.params = convertKeysToSnakeCase(request.params);
    return request;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      !["blob", "stream"].includes(response.config.responseType ?? "")
    )
      response.data = convertKeysToCamelCase(response.data);
    return response;
  },
  (error) => {
    const url = error.config?.url ?? "";
    if (error.response?.status === 401 && !url.includes("/login")) {
      void signOut({ callbackUrl: "/login" });
    }
    return Promise.reject(error);
  }
);

export default axios;
