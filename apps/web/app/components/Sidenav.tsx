"use client";

import React from "react";
import {
  ArrowLeftRight,
  Barcode,
  BookUser,
  Captions,
  Coins,
  Layers,
  ListCheck,
  Map,
  Menu,
  Truck,
  Users,
  Warehouse,
  LogOut,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  BrainCircuit,
  Crown,
  Network,
  Binary,
  Receipt,
  Scale,
  CheckCheck,
  Settings,
  X,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import MeshLogoSvg from "@/app/components/MeshLogoSvg";
import { useSidebar } from "@/app/components/SidebarContext";

interface NavLinkItem {
  name: string;
  path: string;
  icon: any;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavLinkItem[];
}

export default function Sidenav() {
  const { data: session } = useSession();
  const { collapsed, toggleSidebar, mobileOpen, setMobileOpen, isHydrated } = useSidebar();
  const fullPath = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab");

  const currentUserRole = ((session?.user as any)?.userRole || "EMPLOYEE") as string;
  const isSuperAdmin = currentUserRole === "SUPERADMIN";
  const isAdmin = currentUserRole === "ADMIN";

  const sections: NavSection[] = [
    ...(isSuperAdmin
      ? [
          {
            title: "Platform Administration",
            items: [
              { name: "SuperAdmin Hub", path: "/superadmin", icon: Crown },
              { name: "Company Groups", path: "/superadmin?tab=groups", icon: Network },
              { name: "Companies", path: "/companies", icon: Building2 },
              { name: "Users & RBAC", path: "/users", icon: ShieldCheck },
            ],
          },
        ]
      : []),
    {
      title: "Operations",
      items: [
        { name: "Overview", path: "", icon: LayoutDashboard },
        { name: "Orders", path: "/order", icon: ListCheck },
        { name: "Transfers", path: "/transfer", icon: ArrowLeftRight },
      ],
    },
    {
      title: "Assets & Inventory",
      items: [
        { name: "Products", path: "/product", icon: Barcode },
        { name: "Inventory", path: "/inventory", icon: Layers },
        { name: "Forecast & Auto-PO", path: "/forecast", icon: BrainCircuit, badge: "AI" },
        { name: "Warehouses", path: "/warehouse", icon: Warehouse },
        { name: "Locations", path: "/location", icon: Map },
      ],
    },
    {
      title: "Logistics & Supply",
      items: [
        { name: "Deliveries", path: "/delivery", icon: Truck },
        { name: "Returns & RMA", path: "/delivery?tab=rma", icon: RotateCcw },
        { name: "Providers", path: "/provider", icon: BookUser },
        { name: "Customers", path: "/customer", icon: Users },
        { name: "EDI Gateway", path: "/edi", icon: Binary, badge: "EDI" },
      ],
    },
    {
      title: "Finance & Audit",
      items: [
        { name: "Invoices & 3-Way Match", path: "/invoice", icon: Receipt },
        { name: "Approval Queue", path: "/approval", icon: ShieldCheck },
        { name: "Payments", path: "/payment", icon: Coins },
        { name: "Transactions", path: "/transaction", icon: Captions },
      ],
    },
    ...(isAdmin && !isSuperAdmin
      ? [
          {
            title: "Governance",
            items: [
              { name: "Companies", path: "/companies", icon: Building2 },
              { name: "Users & RBAC", path: "/users", icon: ShieldCheck },
            ],
          },
        ]
      : []),
  ];

  const renderNavContent = (isDrawer = false) => {
    const isCollapsed = isDrawer ? false : collapsed;

    return (
      <div
        className={`h-full flex flex-col justify-between p-3 bg-[#141415] text-[#d4d4d8] select-none ${
          isCollapsed ? "overflow-visible" : "overflow-x-hidden overflow-y-auto"
        }`}
      >
        {/* Top Header */}
        <div>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 mb-4 pt-1">
              <Link
                href={isSuperAdmin ? "/dashboard/superadmin" : "/dashboard"}
                className="flex items-center justify-center group"
                title="Mesh Supply Chain"
              >
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-xs transition-opacity group-hover:opacity-90">
                  <MeshLogoSvg size={20} className="text-[#FD3706]" />
                </div>
              </Link>
              <button
                type="button"
                onClick={toggleSidebar}
                className="w-8 h-8 hidden lg:flex items-center justify-center text-[#71717a] hover:text-[#ededed] hover:bg-white/[0.06] rounded-md transition-colors cursor-pointer"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-4 pt-1 px-1">
              <Link
                href={isSuperAdmin ? "/dashboard/superadmin" : "/dashboard"}
                onClick={() => isDrawer && setMobileOpen(false)}
                className="flex items-center gap-2.5 group min-w-0"
                title="Mesh Supply Chain"
              >
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-xs transition-opacity group-hover:opacity-90">
                  <MeshLogoSvg size={20} className="text-[#FD3706]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold tracking-tight text-[#ededed] truncate">
                    Mesh
                  </span>
                  <span className="font-mono text-[10px] text-[#71717a] truncate">
                    {isSuperAdmin ? "Platform Admin" : "Telemetry & Logistics"}
                  </span>
                </div>
              </Link>
              {!isDrawer ? (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="hidden lg:flex items-center justify-center p-1.5 text-[#71717a] hover:text-[#ededed] hover:bg-white/[0.06] rounded-md transition-colors cursor-pointer"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="lg:hidden p-1.5 text-[#71717a] hover:text-[#ededed] hover:bg-white/[0.06] rounded-md transition-colors cursor-pointer"
                  title="Close navigation"
                  aria-label="Close navigation"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Navigation Sections */}
          <nav className="space-y-4 mt-2">
            {sections.map((section, sIndex) => (
              <div key={sIndex} className="space-y-1">
                {!isCollapsed && (
                  <p className="text-[11px] font-medium text-[#71717a] px-2.5 py-1 tracking-normal">
                    {section.title}
                  </p>
                )}
                {isCollapsed && sIndex > 0 && (
                  <div className="h-px bg-white/[0.08] my-2 mx-2" />
                )}
                <ul className="space-y-0.5">
                  {section.items.map((item, iIndex) => {
                    const targetHref = "/dashboard" + item.path;
                    let active = false;
                    if (item.path === "") {
                      active = fullPath === "/dashboard" || fullPath === "/dashboard/";
                    } else if (item.path.includes("tab=")) {
                      const [base, query] = item.path.split("?");
                      const tab = new URLSearchParams(query).get("tab");
                      active = fullPath.startsWith("/dashboard" + base) && currentTab === tab;
                    } else if (item.path === "/delivery") {
                      active = fullPath.startsWith("/dashboard/delivery") && currentTab !== "rma";
                    } else if (item.path === "/superadmin") {
                      active = fullPath === "/dashboard/superadmin" && !currentTab;
                    } else if (item.path === "/companies") {
                      active =
                        fullPath.startsWith("/dashboard/companies") ||
                        (fullPath.startsWith("/dashboard/superadmin") && currentTab === "companies");
                    } else if (item.path === "/users") {
                      active =
                        fullPath.startsWith("/dashboard/users") ||
                        (fullPath.startsWith("/dashboard/superadmin") && currentTab === "users");
                    } else {
                      active = fullPath.startsWith(targetHref);
                    }
                    const Icon = item.icon;

                    return (
                      <li key={iIndex} className="relative group/item">
                        <Link
                          href={targetHref}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center rounded-lg text-xs transition-colors duration-150 ${
                            isCollapsed
                              ? "justify-center h-9 w-9 mx-auto"
                              : "px-2.5 py-2 gap-2.5"
                          } ${
                            active
                              ? isCollapsed
                                ? "bg-[#FD3706]/15 text-[#FD3706] border border-[#FD3706]/30 shadow-2xs"
                                : "bg-[#FD3706]/12 text-white font-medium border border-[#FD3706]/20 shadow-2xs"
                              : "text-[#a1a1a6] hover:text-[#ededed] hover:bg-white/[0.04]"
                          }`}
                          title={isCollapsed ? item.name : undefined}
                        >
                          <Icon
                            className={`shrink-0 w-4 h-4 transition-colors ${
                              active
                                ? "text-[#FD3706]"
                                : "text-[#71717a] group-hover/item:text-[#ededed]"
                            }`}
                          />
                          {!isCollapsed && (
                            <div className="flex-1 flex items-center justify-between min-w-0">
                              <span className="truncate">
                                {item.name}
                              </span>
                              {item.badge ? (
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                                    active
                                      ? "bg-[#FD3706]/20 text-[#FD3706] border border-[#FD3706]/30 font-medium"
                                      : "bg-white/[0.06] text-[#a1a1a6] border border-white/[0.08]"
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              ) : active ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FD3706] shrink-0 ml-auto shadow-[0_0_6px_rgba(253,55,6,0.5)]" />
                              ) : null}
                            </div>
                          )}
                        </Link>

                        {/* Hover Tooltip when collapsed in 72px dock mode */}
                        {isCollapsed && (
                          <div className="hidden lg:block absolute left-full ml-2.5 px-2.5 py-1.5 bg-[#19191b] text-[#ededed] text-xs rounded-md shadow-lg opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto transition-opacity z-50 whitespace-nowrap top-1/2 -translate-y-1/2 border border-white/[0.1]">
                            {item.name}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer Exit / Profile Actions */}
        <div className="pt-3 border-t border-white/[0.08] mt-4">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-8 h-8 rounded-full bg-[#19191b] border border-white/[0.1] flex items-center justify-center font-medium text-xs text-[#ededed] cursor-default"
                title={`${session?.user?.name || "Admin"} (${session?.user?.email || "admin@mesh.com"})`}
              >
                {session?.user?.name
                  ? session.user.name.charAt(0).toUpperCase()
                  : "U"}
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-1.5 text-[#71717a] hover:text-[#FD3706] hover:bg-white/[0.06] rounded-md transition-colors cursor-pointer"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="bg-[#19191b] border border-white/[0.08] rounded-lg p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#27272a] border border-white/[0.1] flex items-center justify-center font-medium text-xs text-[#ededed] shrink-0">
                  {session?.user?.name
                    ? session.user.name.charAt(0).toUpperCase()
                    : "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#ededed] truncate leading-tight">
                    {session?.user?.name || "Operations User"}
                  </p>
                  <span className="text-[10px] font-mono text-[#71717a]">
                    {currentUserRole}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-1.5 text-[#71717a] hover:text-[#FD3706] hover:bg-white/[0.06] rounded-md transition-colors shrink-0 cursor-pointer"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile & Tablet Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile & Tablet Drawer Slide-Out Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#141415] border-r border-white/[0.08] shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderNavContent(true)}
      </div>

      {/* Desktop In-Flow Sidebar Edge-to-Edge */}
      <aside
        className={`hidden lg:flex flex-col justify-between shrink-0 h-screen sticky top-0 bg-[#141415] border-r border-white/[0.08] z-30 ${
          isHydrated ? "transition-all duration-300 ease-in-out" : ""
        } ${collapsed ? "w-[72px]" : "w-64"}`}
        aria-label="Sidebar"
      >
        {renderNavContent(false)}
      </aside>
    </>
  );
}
