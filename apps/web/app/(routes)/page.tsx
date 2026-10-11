"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import MeshLogoSvg from "@/app/components/MeshLogoSvg";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    } else if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-white">
      <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-white shadow-xl animate-pulse mb-4">
        <MeshLogoSvg size={32} />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-white">Mesh Enterprise</h1>
      <p className="text-xs text-slate-400 mt-1">Initializing secure telemetry gateway...</p>
    </div>
  );
}
