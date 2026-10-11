"use client";

import React, { useState, useRef, useEffect } from "react";
import { Building2, Check, ChevronDown, Plus, Globe } from "lucide-react";
import { useCompany } from "./CompanyContext";
import { useSidebar } from "./SidebarContext";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function CompanySwitcher() {
  const {
    companies,
    currentCompany,
    activeCompanyId,
    setCurrentCompanyId,
    isAllCompanies,
  } = useCompany();
  const { collapsed } = useSidebar();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentUserRole = ((session?.user as any)?.userRole || "EMPLOYEE") as string;
  const isAdmin = currentUserRole === "ADMIN";

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (id: string | null) => {
    setCurrentCompanyId(id);
    setOpen(false);
  };

  if (companies.length === 0) {
    return null;
  }

  return (
    <div className="relative my-3" ref={dropdownRef}>
      {collapsed ? (
        // Collapsed View: Compact Button with Tooltip
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="w-11 h-11 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white hover:border-blue-500/50 hover:bg-slate-800 transition-all shadow-xs relative group/switcher"
            title={
              isAllCompanies
                ? "All Companies"
                : currentCompany?.companyName || "Select Company"
            }
          >
            {isAllCompanies ? (
              <Globe className="w-5 h-5 text-blue-400" />
            ) : (
              <div className="w-6 h-6 rounded-md bg-blue-600/30 border border-blue-500/40 text-[11px] font-bold text-blue-300 flex items-center justify-center">
                {(currentCompany?.companyCode || "CO").slice(0, 2)}
              </div>
            )}
            <div className="hidden sm:block absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-xl opacity-0 pointer-events-none group-hover/switcher:opacity-100 group-hover/switcher:pointer-events-auto transition-opacity z-50 whitespace-nowrap top-1/2 -translate-y-1/2 border border-slate-700">
              {isAllCompanies
                ? "Global (All Companies)"
                : `${currentCompany?.companyName || "Company"} (${currentCompany?.companyCode || ""})`}
            </div>
          </button>
        </div>
      ) : (
        // Expanded View: Full Selector Button
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              {isAllCompanies ? (
                <Globe className="w-4 h-4" />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white truncate">
                  {isAllCompanies
                    ? "All Companies"
                    : currentCompany?.companyName || "Select Company"}
                </span>
                {!isAllCompanies && currentCompany?.companyCode && (
                  <span className="text-[10px] font-mono font-bold px-1 py-0.2 rounded bg-slate-800 text-blue-300 border border-slate-700 shrink-0">
                    {currentCompany.companyCode}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {isAllCompanies
                  ? "Aggregated tenant view"
                  : currentCompany?.companyDomain || "Active Workspace"}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      )}

      {/* Dropdown Menu */}
      {open && (
        <div
          className={`absolute z-50 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden py-1.5 backdrop-blur-md ${
            collapsed ? "left-full ml-3 top-0 w-64" : "left-0 right-0 top-full"
          }`}
        >
          <div className="px-3 py-1.5 border-b border-slate-800/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Select Active Company
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {/* Global option for Admins */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleSelect("all")}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-800/80 transition-colors ${
                  isAllCompanies ? "bg-blue-600/20 text-blue-300 font-semibold" : "text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium">All Companies</p>
                    <p className="text-[10px] text-slate-400">Global Admin View</p>
                  </div>
                </div>
                {isAllCompanies && <Check className="w-4 h-4 text-blue-400 shrink-0 ml-2" />}
              </button>
            )}

            {/* Individual Companies */}
            {companies.map((company) => {
              const isSelected = activeCompanyId === company.companyId;
              return (
                <button
                  key={company.companyId}
                  type="button"
                  onClick={() => handleSelect(company.companyId)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-800/80 transition-colors ${
                    isSelected
                      ? "bg-blue-600/20 text-blue-300 font-semibold"
                      : "text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
                      {company.companyCode.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium truncate">{company.companyName}</p>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          {company.companyCode}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {company.companyDomain || "mesh enterprise"}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Manage Companies Link for Admins */}
          {isAdmin && (
            <div className="pt-1.5 mt-1 border-t border-slate-800/80 px-2">
              <Link
                href="/dashboard/companies"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-lg transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <span>Manage Companies</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
