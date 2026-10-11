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
  refreshCompanies: () => Promise<void>;
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
      const list = res.data || [];
      setCompanies(list);
      return list;
    } catch (err) {
      console.error("Failed to fetch companies:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies().then((list) => {
      // Check stored preference
      const saved = typeof window !== "undefined" ? localStorage.getItem("mesh_active_company_id") : null;
      const userCompanyId = (session?.user as any)?.companyId;

      if (saved && (saved === "all" || list.some((c: Company) => c.companyId === saved))) {
        setActiveCompanyIdState(saved);
      } else if (userCompanyId && list.some((c: Company) => c.companyId === userCompanyId)) {
        setActiveCompanyIdState(userCompanyId);
        if (typeof window !== "undefined") {
          localStorage.setItem("mesh_active_company_id", userCompanyId);
        }
      } else if (list.length > 0) {
        // Default to first company
        setActiveCompanyIdState(list[0].companyId);
        if (typeof window !== "undefined") {
          localStorage.setItem("mesh_active_company_id", list[0].companyId);
        }
      }
    });
  }, [fetchCompanies, session]);

  const setCurrentCompanyId = (id: string | null) => {
    setActiveCompanyIdState(id);
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem("mesh_active_company_id", id);
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
