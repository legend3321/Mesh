"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SidebarProvider, useSidebar } from "@/app/components/SidebarContext";
import { CompanyProvider } from "@/app/components/CompanyContext";
import Sidenav from "@/app/components/Sidenav";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidenav />
      <main
        className={`flex-1 min-w-0 p-6 overflow-y-auto transition-all duration-300 ease-in-out ${
          collapsed ? "sm:ml-20" : "sm:ml-64"
        }`}
      >
        {children}
      </main>
    </div>
  );
}

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <CompanyProvider>
      <SidebarProvider>
        <DashboardContent>{children}</DashboardContent>
      </SidebarProvider>
    </CompanyProvider>
  );
}
