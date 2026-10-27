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
    <div className="relative w-full min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-10 overflow-hidden bg-[#F3F4F7] text-[#222026] selection:bg-[#FD3706] selection:text-white">
      {/* Background SVG Telemetry Dot & Dashed Grid Pattern from Stitch */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="telemetry-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#6B7280" opacity="0.3" />
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="2,6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#telemetry-grid)" />
        </svg>
      </div>

      {/* Ambient Gradient Glow Accents */}
      <div className="absolute top-12 -right-24 w-96 h-96 rounded-full bg-[#FD3706]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-8 -left-20 w-80 h-80 rounded-full bg-[#222026]/5 blur-3xl pointer-events-none" />

      {/* Top Header Branding */}
      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center pt-4 sm:pt-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#222026] flex items-center justify-center p-2 shadow-sm shrink-0">
            <MeshLogoSvg size={24} className="text-[#FD3706]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-archivo text-xl font-bold uppercase tracking-tight text-[#222026] leading-none">
              Mesh Supply Chain
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mt-1">
              Telemetry Operations Gateway
            </span>
          </div>
        </div>
      </div>

      {/* Main Authentication Card Container */}
      <div className="relative z-10 w-full max-w-xl mx-auto my-auto py-4">
        <LoginForm />
      </div>

      {/* Streamlined Enterprise Compliance Footer from Stitch */}
      <footer className="relative z-10 w-full max-w-xl mx-auto pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-400 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span>SAML 2.0</span>
          <span className="text-slate-300">·</span>
          <span>SOC2 TYPE II</span>
          <span className="text-slate-300">·</span>
          <span>ISO 27001</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#222026] font-semibold">MESH-OS v4.18.2</span>
          <span className="text-slate-300">·</span>
          <span>SG-04-ORD</span>
        </div>
      </footer>
    </div>
  );
}
