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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import MeshLogoSvg from "@/app/components/MeshLogoSvg";
import { useSidebar } from "@/app/components/SidebarContext";
import CompanySwitcher from "@/app/components/CompanySwitcher";

export default function Sidenav() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggleSidebar } = useSidebar();
  const fullPath = usePathname();

  const currentUserRole = ((session?.user as any)?.userRole || "EMPLOYEE") as string;
  const isAdmin = currentUserRole === "ADMIN";

  const links = [
    { name: "Overview", path: "", icon: LayoutDashboard },
    ...(isAdmin
      ? [
          { name: "Companies", path: "/companies", icon: Building2 },
          { name: "Users & RBAC", path: "/users", icon: ShieldCheck },
        ]
      : []),
    { name: "Product", path: "/product", icon: Barcode },
    { name: "Location", path: "/location", icon: Map },
    { name: "Warehouse", path: "/warehouse", icon: Warehouse },
    { name: "Inventory", path: "/inventory", icon: Layers },
    { name: "AI Forecaster", path: "/forecast", icon: BrainCircuit },
    { name: "Customer", path: "/customer", icon: Users },
    { name: "Delivery", path: "/delivery", icon: Truck },
    { name: "Provider", path: "/provider", icon: BookUser },
    { name: "Order", path: "/order", icon: ListCheck },
    { name: "Transfer", path: "/transfer", icon: ArrowLeftRight },
    { name: "Payment", path: "/payment", icon: Coins },
    { name: "Transaction", path: "/transaction", icon: Captions },
  ];

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="inline-flex items-center p-2 mt-2 ms-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-hidden focus:ring-2 focus:ring-gray-200"
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 sm:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Aside */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-meshBlue text-gray-100 border-r border-slate-800 ${
          collapsed ? "w-20" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}`}
        aria-label="Sidebar"
      >
        <div className="h-full flex flex-col justify-between p-3 overflow-x-hidden overflow-y-auto">
          {/* Top Brand Header & Toggle */}
          <div>
            <div
              className={`flex items-center mb-5 pt-1 ${
                collapsed ? "justify-center" : "justify-between px-1"
              }`}
            >
              <Link
                href="/dashboard"
                className="flex items-center gap-3 group min-w-0"
                title="Mesh Dashboard"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shrink-0 text-white group-hover:bg-blue-600/50 transition-colors shadow-xs">
                  <MeshLogoSvg size={22} />
                </div>
                {!collapsed && (
                  <span className="text-xl font-bold tracking-tight text-white truncate">
                    Mesh
                  </span>
                )}
              </Link>

              {/* Desktop Collapse / Expand Toggle Button */}
              {!collapsed && (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="hidden sm:flex items-center justify-center p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
                  title="Collapse sidebar into logos"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* If collapsed, show a neat expand icon at top */}
            {collapsed && (
              <div className="hidden sm:flex justify-center mb-4">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Multi-Tenant Company Switcher */}
            <CompanySwitcher />

            {/* Navigation Links */}
            <ul className="space-y-1.5 font-medium">
              {links.map((link, index) => {
                const targetHref = "/dashboard" + link.path;
                const active =
                  link.path === ""
                    ? fullPath === "/dashboard" || fullPath === "/dashboard/"
                    : fullPath.startsWith(targetHref);
                const IconComponent = link.icon;

                return (
                  <li key={index} className="relative group/item">
                    <Link
                      href={targetHref}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center rounded-xl transition-all duration-150 ${
                        collapsed
                          ? "justify-center h-11 w-11 mx-auto"
                          : "px-3 py-2.5 gap-3"
                      } ${
                        active
                          ? "bg-blue-600 text-white font-semibold shadow-xs"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                      }`}
                      title={collapsed ? link.name : undefined}
                    >
                      <IconComponent
                        className={`shrink-0 transition-transform ${
                          collapsed ? "w-5 h-5" : "w-4 h-4"
                        } ${active ? "text-white" : "text-slate-300 group-hover/item:text-white"}`}
                      />
                      {!collapsed && (
                        <span className="text-sm truncate">{link.name}</span>
                      )}
                    </Link>

                    {/* Floating Tooltip when Collapsed */}
                    {collapsed && (
                      <div className="hidden sm:block absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-xl opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto transition-opacity z-50 whitespace-nowrap top-1/2 -translate-y-1/2 border border-slate-700">
                        {link.name}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Bottom User Profile & Sign Out */}
          <div className="pt-4 border-t border-slate-800">
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-xs cursor-default"
                  title={`${session?.user?.name || "Admin"} (${session?.user?.email || "admin@mesh.com"})`}
                >
                  {session?.user?.name
                    ? session.user.name.charAt(0).toUpperCase()
                    : "U"}
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 px-2.5 py-2 mb-2 bg-slate-900/50 rounded-xl border border-slate-800/80">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                    {session?.user?.name
                      ? session.user.name.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-white truncate">
                        {session?.user?.name || "Admin User"}
                      </p>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 shrink-0">
                        {currentUserRole}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {session?.user?.email || "admin@mesh.com"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-300 hover:text-red-200 hover:bg-red-950/40 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
