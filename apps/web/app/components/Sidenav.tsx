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
  Bell,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import MeshLogoSvg from "@/app/components/MeshLogoSvg";
import { useSidebar } from "@/app/components/SidebarContext";
import CompanySwitcher from "@/app/components/CompanySwitcher";

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
        { name: "AI Forecaster", path: "/forecast", icon: BrainCircuit, badge: "AI" },
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
    <div className="h-full flex flex-col justify-between p-3 overflow-x-hidden overflow-y-auto">
      {/* Top Header & Switcher */}
      <div>
        <div
          className={`flex items-center mb-3 pt-1 ${
            collapsed ? "justify-center" : "justify-between px-1"
          }`}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 group min-w-0"
            title="Mesh Dashboard"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 text-white group-hover:bg-blue-700 transition-colors shadow-2xs">
              <MeshLogoSvg size={20} />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold tracking-tight text-slate-900 truncate">
                Mesh
              </span>
            )}
          </Link>

          {!collapsed ? (
            <div className="flex items-center gap-1.5">
              {/* Notification Bell with Badge */}
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-2xs relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-white absolute top-1.5 right-1.5" />
              </button>

              {/* Desktop Collapse Toggle */}
              <button
                type="button"
                onClick={toggleSidebar}
                className="hidden sm:flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex justify-center mt-2 mb-1">
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                title="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Company Switcher */}
        <CompanySwitcher />

        {/* Navigation Sections */}
        <nav className="space-y-4 mt-2">
          {sections.map((section, sIndex) => (
            <div key={sIndex} className="space-y-1">
              {!collapsed && (
                <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-3 py-1 select-none">
                  {section.title}
                </p>
              )}
              {collapsed && sIndex > 0 && (
                <div className="h-px bg-slate-200/70 my-2 mx-2" />
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
                            ? "bg-[#eef4ff] text-blue-700 font-semibold border border-blue-200/60 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                        title={collapsed ? item.name : undefined}
                      >
                        <Icon
                          className={`shrink-0 transition-transform ${
                            collapsed ? "w-4 h-4" : "w-4 h-4"
                          } ${
                            active
                              ? "text-blue-600"
                              : "text-slate-400 group-hover/item:text-slate-700"
                          }`}
                        />
                        {!collapsed && (
                          <div className="flex-1 flex items-center justify-between min-w-0">
                            <span className="text-xs font-medium truncate">
                              {item.name}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 border ${
                                  item.badge === "PRO"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>

                      {/* Tooltip when collapsed */}
                      {collapsed && (
                        <div className="hidden sm:block absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-xl opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto transition-opacity z-50 whitespace-nowrap top-1/2 -translate-y-1/2 border border-slate-700">
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

      {/* User Profile Footer */}
      <div className="pt-3 border-t border-slate-200/80 mt-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-2xs cursor-default"
              title={`${session?.user?.name || "Admin"} (${session?.user?.email || "admin@mesh.com"})`}
            >
              {session?.user?.name
                ? session.user.name.charAt(0).toUpperCase()
                : "U"}
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/90 rounded-xl p-2 shadow-2xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs">
                {session?.user?.name
                  ? session.user.name.charAt(0).toUpperCase()
                  : "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
                  {session?.user?.name || "Admin User"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0 border ${
                      isSuperAdmin
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : isAdmin
                        ? "bg-purple-50 text-purple-800 border-purple-200"
                        : "bg-blue-50 text-blue-800 border-blue-200"
                    }`}
                  >
                    {currentUserRole}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
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
      <div className="sm:hidden flex items-center justify-between p-3 bg-[#f8f9fa] border-b border-slate-200">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-600 rounded-lg hover:bg-slate-200/60"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-900">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <MeshLogoSvg size={16} />
          </div>
          <span>Mesh</span>
        </Link>
        <div className="w-8" />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-40 sm:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#f8f9fa] border-r border-slate-200 transition-transform duration-300 ease-in-out sm:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderNavContent()}
      </div>

      {/* Desktop In-Flow Sidebar inside Framed Container */}
      <aside
        className={`hidden sm:flex flex-col justify-between shrink-0 h-full transition-all duration-300 ease-in-out bg-[#f8f9fa] border-r border-slate-200 ${
          collapsed ? "w-20" : "w-64"
        }`}
        aria-label="Sidebar"
      >
        {renderNavContent()}
      </aside>
    </>
  );
}
