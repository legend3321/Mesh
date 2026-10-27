"use client";

import React, { useState, useRef, useEffect } from "react";
import { Building2, Check, ChevronDown, Plus, Globe, Crown, Network } from "lucide-react";
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
  const isSuperAdmin = currentUserRole === "SUPERADMIN";
  const isAdmin = currentUserRole === "ADMIN" || isSuperAdmin;

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
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs relative group/switcher"
            title={
              isAllCompanies
                ? "All Companies"
                : currentCompany?.companyName || "Select Company"
            }
          >
            {isAllCompanies ? (
              <Globe className="w-4 h-4 text-blue-600" />
            ) : (
              <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-700 flex items-center justify-center">
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
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 transition-all text-left shadow-2xs group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              {isAllCompanies ? (
                <Globe className="w-3.5 h-3.5" />
              ) : (
                <Building2 className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {isAllCompanies
                    ? "All Companies"
                    : currentCompany?.companyName || "Select Company"}
                </span>
                {!isAllCompanies && currentCompany?.companyCode && (
                  <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    {currentCompany.companyCode}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                {isAllCompanies
                  ? "Aggregated tenant view"
                  : currentCompany?.companyDomain || "Active Workspace"}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      )}

      {/* Dropdown Menu */}
      {open && (
        <div
          className={`absolute z-50 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1 ${
            collapsed ? "left-full ml-3 top-0 w-64" : "left-0 right-0 top-full"
          }`}
        >
          <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
              {isSuperAdmin
                ? "Select Active Company (Global)"
                : (companies[0]?.companyGroup?.groupName ? `Group: ${companies[0].companyGroup.groupName}` : "Select Active Company")}
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {/* Direct SuperAdmin Hub Link */}
            {isSuperAdmin && (
              <Link
                href="/dashboard/superadmin"
                onClick={() => setOpen(false)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-left bg-gradient-to-r from-amber-50 to-purple-50 hover:from-amber-100/70 hover:to-purple-100/70 text-amber-900 font-semibold border-b border-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                    <Crown className="w-3 h-3" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-amber-900">SuperAdmin Control Plane</p>
                    <p className="text-[10px] text-amber-700">Manage Groups & Users</p>
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 -rotate-90 text-amber-700" />
              </Link>
            )}

            {/* Global option for Admins */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleSelect("all")}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${
                  isAllCompanies ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-slate-800">{isSuperAdmin ? "All Companies" : "All Group Entities"}</p>
                    <p className="text-[10px] text-slate-500">{isSuperAdmin ? "Global Aggregated View" : "Group Aggregated View"}</p>
                  </div>
                </div>
                {isAllCompanies && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
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
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${
                    isSelected
                      ? "bg-blue-50/80 text-blue-700 font-semibold"
                      : "text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                      {company.companyCode.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-slate-800 truncate">{company.companyName}</p>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          {company.companyCode}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {company.companyGroup?.groupName
                          ? `${company.companyGroup.groupName}`
                          : company.companyDomain || "mesh enterprise"}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Manage Links */}
          {isAdmin && (
            <div className="pt-1 mt-1 border-t border-slate-100 px-2 space-y-0.5 bg-slate-50/30">
              {isSuperAdmin && (
                <Link
                  href="/dashboard/superadmin?tab=groups"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors font-medium"
                >
                  <Network className="w-3.5 h-3.5 text-amber-600" />
                  <span>Manage Groups of Companies</span>
                </Link>
              )}
              <Link
                href="/dashboard/companies"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Manage Companies</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
