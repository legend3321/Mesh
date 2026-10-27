"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  toggleSidebar: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
  toggleMobile: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore user's preference from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mesh_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch (e) {
      // Ignore localStorage issues
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mesh_sidebar_collapsed", String(next));
      } catch (e) {
        // Ignore
      }
      return next;
    });
  };

  const toggleMobile = () => {
    setMobileOpen((prev) => !prev);
  };

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed,
        toggleSidebar,
        mobileOpen,
        setMobileOpen,
        toggleMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
