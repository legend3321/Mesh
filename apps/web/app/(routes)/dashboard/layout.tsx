"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SidebarProvider } from "@/app/components/SidebarContext";
import { CompanyProvider } from "@/app/components/CompanyContext";
import Sidenav from "@/app/components/Sidenav";

function DashboardContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#edf0f5] p-2 sm:p-3.5 md:p-5 flex items-stretch justify-center">
      <div className="w-full max-w-[1720px] bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col sm:flex-row relative min-h-[calc(100vh-1rem)] sm:min-h-[calc(100vh-1.75rem)] md:min-h-[calc(100vh-2.5rem)]">
        <Sidenav />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-7 overflow-y-auto bg-white flex flex-col transition-all duration-300">
          {children}
        </main>
      </div>
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
      <div className="min-h-screen bg-[#edf0f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
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
