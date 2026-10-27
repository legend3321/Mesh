"use client";

import React, { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Search, ChevronDown, User, LogOut, Building, ShieldCheck, Menu } from "lucide-react";
import { useCompany } from "./CompanyContext";
import { useSidebar } from "./SidebarContext";
import MeshLogoSvg from "./MeshLogoSvg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const { data: session } = useSession();
  const { currentCompany, activeCompanyId, isAllCompanies, companies, setCurrentCompanyId } = useCompany();
  const { toggleMobile } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");

  const currentUserRole = ((session?.user as any)?.userRole || "EMPLOYEE") as string;
  const isSuperAdmin = currentUserRole === "SUPERADMIN";
  const userGroupName =
    (session?.user as any)?.companyGroup?.groupName ||
    companies[0]?.companyGroup?.groupName;
  const userName = session?.user?.name || "Terminal Operator";
  const userEmail = session?.user?.email || "dispatch@meshlogistics.io";

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between gap-4 transition-all">
      {/* Brand & Context Title */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Mobile / Tablet Drawer Hamburger Toggle */}
        <button
          type="button"
          onClick={toggleMobile}
          className="lg:hidden p-2 -ml-1 text-[#222026] hover:bg-[#F3F4F7] rounded-lg transition-colors cursor-pointer shrink-0"
          title="Open Navigation"
          aria-label="Open Navigation Drawer"
        >
          <Menu className="w-5 h-5 text-[#222026]" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-archivo text-sm sm:text-base font-bold uppercase tracking-tight text-[#222026] whitespace-nowrap">
                Mesh Supply Chain
              </span>
              <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#FD3706]/10 text-[#FD3706] whitespace-nowrap">
                LIVE TELEMETRY
              </span>
            </div>
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Operations & Inventory Grid
            </span>
          </div>
        </div>

        {/* Multi-Tenant Company Selector Capsule */}
        {companies.length > 0 && (
          <div className="pl-3 border-l border-slate-200 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F3F4F7] hover:bg-slate-200 text-xs font-medium text-[#222026] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Building className="w-3.5 h-3.5 text-[#FD3706] shrink-0" />
                  <span className="max-w-[120px] sm:max-w-[180px] truncate font-medium">
                    {isAllCompanies
                      ? isSuperAdmin
                        ? "All Companies"
                        : "All Group Entities"
                      : currentCompany
                      ? currentCompany.companyName
                      : "Select Facility"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-white shadow-lg border border-slate-200">
                <DropdownMenuLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                  {isSuperAdmin
                    ? "Switch Active Entity (Global)"
                    : userGroupName
                    ? `Group · ${userGroupName}`
                    : "Switch Active Entity"}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setCurrentCompanyId("all")}
                  className={`text-xs cursor-pointer ${isAllCompanies ? "font-bold text-[#FD3706] bg-slate-50" : "text-slate-700"}`}
                >
                  🌐 {isSuperAdmin ? "All Companies (Aggregated)" : "All Group Entities (Aggregated)"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {companies.map((c) => (
                  <DropdownMenuItem
                    key={c.companyId}
                    onClick={() => setCurrentCompanyId(c.companyId)}
                    className={`text-xs cursor-pointer ${
                      activeCompanyId === c.companyId ? "font-bold text-[#FD3706] bg-slate-50" : "text-slate-700"
                    }`}
                  >
                    <Building className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                    <span className="truncate">{c.companyName}</span>
                    <span className="ml-auto text-[10px] font-mono text-slate-400">{c.companyCode}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Right Controls: Search Capsule, Currency Pill, User Profile (NO Notification Icon) */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Quick Search */}
        <div className="hidden lg:flex items-center bg-[#F3F4F7] px-3 py-1.5 rounded-lg border border-transparent focus-within:border-slate-300 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search SKUs, Containers, POs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-0 outline-none text-xs text-[#222026] placeholder:text-slate-400 w-44 xl:w-56 ml-2"
          />
        </div>

        {/* Currency Capsule */}
        <div className="hidden sm:inline-flex items-center px-2.5 py-1.5 rounded-lg bg-[#F3F4F7] text-[#222026] font-mono text-xs font-semibold border border-transparent whitespace-nowrap shrink-0">
          <span>USD $</span>
        </div>

        {/* User Profile Capsule */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1 rounded-lg hover:bg-[#F3F4F7] transition-colors whitespace-nowrap cursor-pointer shrink-0"
            >
              <div className="w-8 h-8 rounded-full bg-[#222026] text-white flex items-center justify-center font-bold text-xs font-archivo shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-[#222026] leading-tight truncate max-w-[130px]">
                  {userName}
                </span>
                <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase leading-none">
                  {currentUserRole}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-white shadow-lg border border-slate-200">
            <DropdownMenuLabel className="text-xs">
              <div className="font-bold text-[#222026]">{userName}</div>
              <div className="text-[11px] text-slate-500 font-mono">{userEmail}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign Out Terminal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
