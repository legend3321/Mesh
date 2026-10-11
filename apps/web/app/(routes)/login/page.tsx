import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import LoginForm from "./form";
import MeshLogoSvg from "@/app/components/MeshLogoSvg";
import {
  Building2,
  ShieldCheck,
  Layers,
  Activity,
  ArrowLeftRight,
  TrendingUp,
  Warehouse,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default async function LoginPage() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen w-full bg-[#070B14] text-slate-100 flex flex-col lg:grid lg:grid-cols-12 overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* LEFT SECTION: Enterprise Platform Showcase & Architecture (Col 7) */}
      <div className="hidden lg:flex lg:col-span-7 xl:col-span-7 flex-col justify-between p-10 xl:p-14 relative bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/80 border-r border-slate-800/80">
        {/* Subtle Ambient Background Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header / Branding */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <MeshLogoSvg size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight text-white">Mesh</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  v2.4 Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Supply Chain & Telemetry Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-emerald-300">Cluster rs0 Operational</span>
          </div>
        </div>

        {/* Middle Showcase: Value Proposition & Feature Matrix */}
        <div className="relative z-10 my-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-400/20 mb-4">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            Autonomous Supply Topology
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Unified Multi-Tenant Inventory & Real-Time Logistics Command Center
          </h1>
          <p className="text-sm xl:text-base text-slate-300 leading-relaxed mb-8">
            Manage distributed warehouse facilities, automated replenishment, and multi-tier
            inter-company transactions with fine-grained role governance and cryptographic tenant isolation.
          </p>

          {/* Feature Grid - Reflecting newly added systems */}
          <div className="grid sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-md">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Multi-Tenancy Isolation
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Strict partition boundaries for enterprise entities including Apex Logistics and Starlight Global Retail.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-md">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Role-Based Access (RBAC)
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Autonomous enforcement across Super-Admin, Operations Manager, and Employee privilege scopes.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-md">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Telemetry Graphs
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Real-time MongoDB-computed Recharts analytics for stock valuations, cashflow, and fulfillment rates.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-md">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  11 Interlinked Domains
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Seamless bidirectional drawer navigation linking SKUs, warehouses, transfers, POs, and payments.
              </p>
            </div>
          </div>

          {/* Telemetry Stats Bar */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-4 gap-4">
            <div>
              <p className="text-xl font-bold text-white">99.98%</p>
              <p className="text-[11px] text-slate-400 font-medium">SLA Availability</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">5 Hubs</p>
              <p className="text-[11px] text-slate-400 font-medium">Active Warehouses</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">2 Tenants</p>
              <p className="text-[11px] text-slate-400 font-medium">Enterprise Scope</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">&lt; 15ms</p>
              <p className="text-[11px] text-slate-400 font-medium">API Response</p>
            </div>
          </div>
        </div>

        {/* Bottom Left Security Seal */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800/60">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            256-Bit Cryptographic TLS &bull; Audited Multi-Tenancy
          </span>
          <span>&copy; {new Date().getFullYear()} Mesh Global Logistics Inc.</span>
        </div>
      </div>

      {/* RIGHT SECTION: Sign-In Form & Interactive Quick Access (Col 5) */}
      <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 relative bg-gradient-to-b from-[#090E1A] to-[#060911]">
        {/* Subtle Decorative Background Lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

        <div className="relative z-10 w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
