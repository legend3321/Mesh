"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import api from "@/app/assets/api";
import { useSession } from "next-auth/react";
import type { Company } from "@mesh/types";

interface CompanyContextType {
  companies: Company[];
  currentCompany: Company | null;
  activeCompanyId: string | null;
  setCurrentCompanyId: (id: string | null) => void;
  refreshCompanies: () => Promise<Company[] | void>;
  loading: boolean;
  isAllCompanies: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/company/getAll");
      let list: Company[] = res.data || [];

      // Guardrail: Non-superadmins only ever retain their own company group's companies
      const user = session?.user as any;
      const currentUserRole = user?.userRole || "EMPLOYEE";
      const isSuperAdmin = currentUserRole === "SUPERADMIN";
      const userGroupId = user?.companyGroupId;
      const userCompanyId = user?.companyId;

      if (!isSuperAdmin && (userGroupId || userCompanyId)) {
        list = list.filter((c: Company) => {
          if (userGroupId && c.companyGroupId) {
            return c.companyGroupId === userGroupId;
          }
          if (userCompanyId) {
            return c.companyId === userCompanyId;
          }
          return false;
        });
      }

      setCompanies(list);
      return list;
    } catch (err) {
      console.error("Failed to fetch companies:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchCompanies().then((list) => {
      // Check stored preference
      const saved = typeof window !== "undefined" ? localStorage.getItem("mesh_active_company_id") : null;
      const userCompanyId = (session?.user as any)?.companyId;

      // Validate saved: it must belong to `list` (which is already scoped to user's company group)
      if (saved && (saved === "all" || list.some((c: Company) => c.companyId === saved))) {
        setActiveCompanyIdState(saved);
      } else if (userCompanyId && list.some((c: Company) => c.companyId === userCompanyId)) {
        setActiveCompanyIdState(userCompanyId);
        if (typeof window !== "undefined") {
          localStorage.setItem("mesh_active_company_id", userCompanyId);
        }
      } else if (list.length > 0) {
        // Default to first company in user's group
        setActiveCompanyIdState(list[0].companyId);
        if (typeof window !== "undefined") {
          localStorage.setItem("mesh_active_company_id", list[0].companyId);
        }
      }
    });
  }, [fetchCompanies, session]);

  const setCurrentCompanyId = (id: string | null) => {
    const user = session?.user as any;
    const isSuperAdmin = (user?.userRole || "EMPLOYEE") === "SUPERADMIN";

    let targetId = id;
    if (targetId && targetId !== "all" && !isSuperAdmin) {
      const allowed = companies.some((c) => c.companyId === targetId);
      if (!allowed) {
        targetId = user?.companyId || (companies[0] ? companies[0].companyId : null);
      }
    }

    setActiveCompanyIdState(targetId);
    if (typeof window !== "undefined") {
      if (targetId) {
        localStorage.setItem("mesh_active_company_id", targetId);
      } else {
        localStorage.removeItem("mesh_active_company_id");
      }
      // Dispatch an event so components listening can reload immediately
      window.dispatchEvent(new Event("mesh-company-changed"));
    }
  };

  const currentCompany =
    activeCompanyId && activeCompanyId !== "all"
      ? companies.find((c) => c.companyId === activeCompanyId) || null
      : null;

  const isAllCompanies = activeCompanyId === "all";

  return (
    <CompanyContext.Provider
      value={{
        companies,
        currentCompany,
        activeCompanyId,
        setCurrentCompanyId,
        refreshCompanies: fetchCompanies,
        loading,
        isAllCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
