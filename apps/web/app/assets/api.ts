import axios from "axios";
import { getSession } from "next-auth/react";

const url = "http://localhost:3001/api";

const api = axios.create({
  baseURL: url,
  headers: {
    "content-type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  // If running in browser, inject NextAuth authToken and active tenant companyId
  if (typeof window !== "undefined") {
    try {
      const session: any = await getSession();
      if (session?.authToken) {
        config.headers.Authorization = `Bearer ${session.authToken}`;
      }

      const isSuperAdmin = session?.user?.userRole === "SUPERADMIN";
      const activeCompanyId = isSuperAdmin
        ? null
        : localStorage.getItem("mesh_active_company_id") || session?.user?.companyId;

      if (activeCompanyId && activeCompanyId !== "all") {
        config.headers["x-company-id"] = activeCompanyId;
      }
    } catch (e) {
      // Fallback
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      // If unauthorized, redirect user to login
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
