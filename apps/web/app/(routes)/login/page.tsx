import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import LoginForm from "./form";
import MeshLogoSvg from "@/app/components/MeshLogoSvg";

export default async function LoginPage() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 lg:p-8 bg-[#F4F4F5] text-zinc-900 selection:bg-[#FD3706] selection:text-white">
      {/* Top Bar Branding */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between pt-2 sm:pt-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center p-1.5 shadow-2xs shrink-0">
            <MeshLogoSvg size={18} className="text-[#FD3706]" />
          </div>
          <div className="flex flex-col">
            <span className="font-archivo text-sm font-semibold tracking-tight text-zinc-900 leading-none">
              Mesh
            </span>
            <span className="font-mono text-[11px] text-zinc-500 mt-0.5">
              Supply Chain Platform
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          <span>Network Online</span>
          <span className="text-zinc-300">·</span>
          <span>ORD Hub</span>
        </div>
      </header>

      {/* Main Authentication & Telemetry Console Container */}
      <main className="w-full max-w-5xl mx-auto my-auto py-6">
        <LoginForm />
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-zinc-400 font-mono text-xs border-t border-zinc-200/60">
        <div>
          <span>Multi-facility freight telemetry & dispatch grid</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          <span>v4.18.2</span>
          <span className="text-zinc-300">·</span>
          <span>SG-04-ORD</span>
        </div>
      </footer>
    </div>
  );
}
