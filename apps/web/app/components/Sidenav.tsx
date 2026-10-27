"use client";

import React, { useState } from "react";
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
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggleSidebar } = useSidebar();
  const fullPath = usePathname();

  const currentUserRole = ((session?.user as any)?.userRole || "EMPLOYEE") as string;
  const isSuperAdmin = currentUserRole === "SUPERADMIN";
  const isAdmin = currentUserRole === "ADMIN" || isSuperAdmin;

  const sections: NavSection[] = [
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
        { name: "Warehouses", path: "/warehouse", icon: Warehouse },
        { name: "Locations", path: "/location", icon: Map },
      ],
    },
    {
      title: "Logistics & Supply",
      items: [
        { name: "Deliveries", path: "/delivery", icon: Truck },
        { name: "Providers", path: "/provider", icon: BookUser },
        { name: "Customers", path: "/customer", icon: Users },
      ],
    },
    {
      title: "Finance & Audit",
      items: [
        { name: "Payments", path: "/payment", icon: Coins },
        { name: "Transactions", path: "/transaction", icon: Captions },
      ],
    },
    ...(isAdmin || isSuperAdmin
      ? [
          {
            title: isSuperAdmin ? "SuperAdmin Control Plane" : "Governance",
            items: [
              ...(isSuperAdmin
                ? [
                    { name: "SuperAdmin Hub", path: "/superadmin", icon: Crown, badge: "PRO" },
                    { name: "Company Groups", path: "/superadmin?tab=groups", icon: Network },
                  ]
                : []),
              ...(isAdmin
                ? [
                    { name: "Companies", path: "/companies", icon: Building2 },
                    { name: "Users & RBAC", path: "/users", icon: ShieldCheck },
                  ]
                : []),
            ],
          },
        ]
      : []),
  ];

  const renderNavContent = () => (
    <div className="h-full flex flex-col justify-between p-3 overflow-x-hidden overflow-y-auto bg-[#222026] text-[#CAC5CD] select-none">
      {/* Top Header */}
      <div>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 mb-4 pt-1">
            <Link
              href="/dashboard"
              className="flex items-center justify-center group"
              title="Mesh Supply Chain"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                <MeshLogoSvg size={22} className="text-[#FD3706]" />
              </div>
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              className="w-8 h-8 hidden sm:flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#19171C] rounded-lg transition-colors cursor-pointer"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-4 pt-1 px-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group min-w-0"
              title="Mesh Supply Chain"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                <MeshLogoSvg size={22} className="text-[#FD3706]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-archivo text-base font-bold tracking-tight text-white uppercase truncate">
                  Mesh
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
                  SCM Telemetry
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden sm:flex items-center justify-center p-1.5 text-slate-400 hover:text-white hover:bg-[#19171C] rounded-lg transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="space-y-4 mt-2">
          {sections.map((section, sIndex) => (
            <div key={sIndex} className="space-y-1">
              {!collapsed && (
                <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-3 py-1 font-mono">
                  {section.title}
                </p>
              )}
              {collapsed && sIndex > 0 && (
                <div className="h-px bg-[#333138] my-2 mx-2" />
              )}
              <ul className="space-y-0.5">
                {section.items.map((item, iIndex) => {
                  const targetHref = "/dashboard" + item.path;
                  const active =
                    item.path === ""
                      ? fullPath === "/dashboard" || fullPath === "/dashboard/"
                      : fullPath.startsWith(targetHref);
                  const Icon = item.icon;

                  return (
                    <li key={iIndex} className="relative group/item">
                      <Link
                        href={targetHref}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center rounded-lg transition-all duration-150 ${
                          collapsed
                            ? "justify-center h-10 w-10 mx-auto"
                            : "px-2.5 py-2 gap-2.5"
                        } ${
                          active
                            ? "bg-[#FD3706] text-white font-semibold shadow-sm"
                            : "text-[#CAC5CD] hover:text-white hover:bg-[#19171C]"
                        }`}
                        title={collapsed ? item.name : undefined}
                      >
                        <Icon
                          className={`shrink-0 transition-transform ${
                            collapsed ? "w-4 h-4" : "w-4 h-4"
                          } ${
                            active
                              ? "text-white"
                              : "text-slate-400 group-hover/item:text-white"
                          }`}
                        />
                        {!collapsed && (
                          <div className="flex-1 flex items-center justify-between min-w-0">
                            <span className="text-xs font-medium truncate">
                              {item.name}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                  active
                                    ? "bg-white/20 text-white"
                                    : item.badge === "PRO"
                                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                                    : "bg-[#FD3706]/20 text-[#FD3706] border border-[#FD3706]/30"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>

                      {/* Hover Tooltip when collapsed in 72px dock mode */}
                      {collapsed && (
                        <div className="hidden sm:block absolute left-full ml-3 px-2.5 py-1.5 bg-[#19171C] text-white text-xs font-semibold rounded-md shadow-xl opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto transition-opacity z-50 whitespace-nowrap top-1/2 -translate-y-1/2 border border-[#333138]">
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
      <div className="pt-3 border-t border-[#333138] mt-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-9 h-9 rounded-full bg-[#19171C] border border-[#333138] flex items-center justify-center font-bold text-xs text-white shadow-2xs cursor-default font-archivo"
              title={`${session?.user?.name || "Admin"} (${session?.user?.email || "admin@mesh.com"})`}
            >
              {session?.user?.name
                ? session.user.name.charAt(0).toUpperCase()
                : "U"}
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 text-slate-400 hover:text-[#FD3706] hover:bg-[#19171C] rounded-lg transition-colors"
              title="Sign Out Terminal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="bg-[#19171C] border border-[#333138] rounded-xl p-2.5 shadow-2xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#FD3706] flex items-center justify-center font-bold text-xs text-white shrink-0 font-archivo">
                {session?.user?.name
                  ? session.user.name.charAt(0).toUpperCase()
                  : "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {session?.user?.name || "Admin User"}
                </p>
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
                  {currentUserRole}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-1.5 text-slate-400 hover:text-[#FD3706] hover:bg-[#222026] rounded-lg transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Navbar Bar */}
      <div className="sm:hidden flex items-center justify-between p-3 bg-[#222026] text-white border-b border-[#19171C]">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#19171C]"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#FD3706]">
            <MeshLogoSvg size={16} />
          </div>
          <span className="font-archivo tracking-tight">Mesh</span>
        </Link>
        <div className="w-8" />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-40 sm:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#222026] border-r border-[#19171C] transition-transform duration-300 ease-in-out sm:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderNavContent()}
      </div>

      {/* Desktop In-Flow Sidebar Edge-to-Edge */}
      <aside
        className={`hidden sm:flex flex-col justify-between shrink-0 h-screen sticky top-0 transition-all duration-300 ease-in-out bg-[#222026] border-r border-[#19171C] ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
        aria-label="Sidebar"
      >
        {renderNavContent()}
      </aside>
    </>
  );
}
