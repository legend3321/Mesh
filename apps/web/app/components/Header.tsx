"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Search, ChevronDown, LogOut, Building, ShieldCheck, Menu } from "lucide-react";
import { useCompany } from "./CompanyContext";
import { useSidebar } from "./SidebarContext";
import GlobalSearchModal from "./GlobalSearchModal";
import FacilityCommandPalette from "./FacilityCommandPalette";
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
  const { currentCompany, isAllCompanies } = useCompany();
  const { toggleMobile } = useSidebar();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [facilityPaletteOpen, setFacilityPaletteOpen] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const [activeFacilityLabelState, setActiveFacilityLabelState] = useState<string | null>(null);

  const currentUserRole = ((session?.user as any)?.userRole || "EMPLOYEE") as string;
  const isSuperAdmin = currentUserRole === "SUPERADMIN";
  const userName = session?.user?.name || "Terminal Operator";
  const userEmail = session?.user?.email || "dispatch@meshlogistics.io";

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    }

    const updateActiveFacility = () => {
      try {
        const activeRaw = localStorage.getItem("mesh_active_facility");
        if (activeRaw) {
          const parsed = JSON.parse(activeRaw);
          setActiveFacilityLabelState(
            parsed.code ? `${parsed.code} · ${parsed.name}` : parsed.name
          );
        } else {
          setActiveFacilityLabelState(null);
        }
      } catch {
        setActiveFacilityLabelState(null);
      }
    };

    updateActiveFacility();
    window.addEventListener("mesh-facility-changed", updateActiveFacility);
    window.addEventListener("mesh-company-changed", updateActiveFacility);
    return () => {
      window.removeEventListener("mesh-facility-changed", updateActiveFacility);
      window.removeEventListener("mesh-company-changed", updateActiveFacility);
    };
  }, []);

  const shortcutLabel = isMac ? "⌘K" : "Ctrl+K";

  const displayFacilityName = isAllCompanies
    ? "All Facilities / Group Entities"
    : activeFacilityLabelState
    ? activeFacilityLabelState
    : currentCompany
    ? currentCompany.companyName
    : "All Facilities / Group Entities";

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
              {isSuperAdmin ? "Platform Administration & Control" : "Operations & Inventory Grid"}
            </span>
          </div>
        </div>

        {/* Global Facility Command Palette Trigger Capsule */}
        <div className="pl-3 border-l border-slate-200 shrink-0 flex items-center gap-2">
          {isSuperAdmin && (
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-800 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Backend Control</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setFacilityPaletteOpen(true)}
            className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#F3F4F7] hover:bg-slate-200/90 text-xs font-medium text-[#222026] border border-transparent hover:border-slate-300 transition-all cursor-pointer group shadow-2xs"
            title={`Global Facility Command Palette (${shortcutLabel})`}
            aria-label={`Open Global Facility Command Palette (${shortcutLabel})`}
          >
            <Building className="w-3.5 h-3.5 text-[#FD3706] shrink-0 transition-transform group-hover:scale-110" />
            <span className="max-w-[120px] sm:max-w-[180px] md:max-w-[220px] lg:max-w-[260px] truncate font-medium">
              {displayFacilityName}
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white border border-slate-200 rounded text-slate-500 shadow-2xs ml-0.5">
              {shortcutLabel}
            </kbd>
          </button>
        </div>
      </div>

      {/* Right Controls: Search Capsule, Currency Pill, User Profile (NO Notification Icon) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Quick Search Button (Desktop) */}
        <button
          type="button"
          onClick={() => setSearchModalOpen(true)}
          className="hidden lg:flex items-center justify-between bg-[#F3F4F7] hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-300 transition-all text-xs text-slate-500 w-44 xl:w-60 cursor-pointer"
          title="Search Mesh platform (/ or ⌘/)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">Search SKUs, POs, Depots...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
            /
          </kbd>
        </button>

        {/* Quick Search Icon Button (Mobile / Tablet) */}
        <button
          type="button"
          onClick={() => setSearchModalOpen(true)}
          className="lg:hidden p-2 text-[#222026] hover:bg-[#F3F4F7] rounded-lg transition-colors cursor-pointer shrink-0"
          title="Search Mesh platform"
          aria-label="Open Global Search"
        >
          <Search className="w-5 h-5 text-slate-600" />
        </button>

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

      {/* Global Command Palette Search Modal */}
      <GlobalSearchModal open={searchModalOpen} onOpenChange={setSearchModalOpen} />

      {/* Global Facility Command Palette Modal */}
      <FacilityCommandPalette open={facilityPaletteOpen} onOpenChange={setFacilityPaletteOpen} />
    </header>
  );
}
