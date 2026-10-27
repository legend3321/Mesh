"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Sparkles,
  AlertCircle,
  Building,
  Headphones,
  X,
  PhoneCall,
  ChevronDown,
} from "lucide-react";

const FormSchema = z.object({
  userEmail: z.string().email({
    message: "Please enter a valid corporate dispatch email address.",
  }),
  userPassword: z.string().min(5, {
    message: "Security passphrase must be at least 6 characters.",
  }),
});

type FormData = z.infer<typeof FormSchema>;

export const DEMO_ACCOUNTS = [
  {
    company: "Universal Platform",
    group: "Apex Global Intermodal Group",
    role: "SUPERADMIN",
    name: "Ujjwal Chaudhary",
    email: "superadmin@mesh.com",
    password: "admin123",
    tag: "SuperAdmin",
  },
  {
    company: "Apex Pacific Freight",
    group: "Apex Global Intermodal Group",
    role: "ADMIN",
    name: "Marcus Vance",
    email: "admin@mesh.com",
    password: "admin123",
    tag: "Apex Admin",
  },
  {
    company: "Apex Pacific Freight",
    group: "Apex Global Intermodal Group",
    role: "MANAGER",
    name: "Sarah Jenkins",
    email: "s.jenkins@mesh.com",
    password: "admin123",
    tag: "Apex Ops",
  },
  {
    company: "Nordic Pulse Tech",
    group: "Nordic Pulse Lifestyle & Electronics",
    role: "ADMIN",
    name: "Elena Rostova",
    email: "elena.rostova@mesh.com",
    password: "admin123",
    tag: "Nordic Admin",
  },
  {
    company: "Celestia Robotics",
    group: "Celestia Robotics & Hardware Group",
    role: "ADMIN",
    name: "Dr. Klaus Becker",
    email: "klaus.becker@mesh.com",
    password: "admin123",
    tag: "Celestia Admin",
  },
];

export default function LoginForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"credentials" | "sso">("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activePersona, setActivePersona] = useState<string | null>("superadmin@mesh.com");
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [selectedHub, setSelectedHub] = useState("ORD-01");
  const [rememberShift, setRememberShift] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userEmail: "superadmin@mesh.com",
      userPassword: "admin123",
    },
  });

  const handleSelectDemoAccount = (demo: (typeof DEMO_ACCOUNTS)[0]) => {
    setActivePersona(demo.email);
    setAuthError(null);
    form.setValue("userEmail", demo.email);
    form.setValue("userPassword", demo.password);
    toast({
      title: "Demo Credentials Loaded",
      description: `Loaded ${demo.role} for ${demo.company}.`,
    });
  };

  const onSubmit = async (data: FormData) => {
    setAuthError(null);
    const { userEmail, userPassword } = data;

    try {
      const response = await signIn("credentials", {
        userEmail,
        userPassword,
        redirect: false,
      });

      if (!response?.ok || response?.error) {
        setAuthError("Invalid corporate dispatch email or security passphrase. Please verify your credentials.");
        toast({
          title: "Authentication Failed",
          description: "Could not authenticate with provided credentials.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Authentication Successful",
        description: "Entering Mesh Supply Chain Gateway...",
      });

      if (userEmail.toLowerCase().includes("superadmin")) {
        router.push("/dashboard/superadmin");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (error: any) {
      console.error("Login Failed:", error);
      setAuthError(error.message || "An unexpected error occurred during sign-in.");
      toast({
        title: "Login Exception",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Toaster />
      <div className="w-full bg-white rounded-2xl shadow-xl border border-[#E5E7EB] p-6 sm:p-8 md:p-10 flex flex-col transition-all">
        {/* Card Header & 2-Way Tab Switcher from Stitch (No overflow!) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-5 border-b border-slate-100">
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Checkpoint Terminal 04
            </span>
            <h1 className="font-archivo text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#222026] truncate">
              Identity Authentication
            </h1>
          </div>

          <div className="inline-flex p-1 bg-[#F3F4F7] rounded-xl self-start sm:self-auto shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("credentials")}
              className={`px-3.5 py-1.5 rounded-lg font-archivo text-xs font-semibold uppercase tracking-wide transition-all ${
                activeTab === "credentials"
                  ? "bg-[#FD3706] text-white shadow-xs"
                  : "text-slate-500 hover:text-[#222026]"
              }`}
            >
              Credentials
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sso")}
              className={`px-3.5 py-1.5 rounded-lg font-archivo text-xs font-semibold uppercase tracking-wide transition-all ${
                activeTab === "sso"
                  ? "bg-[#FD3706] text-white shadow-xs"
                  : "text-slate-500 hover:text-[#222026]"
              }`}
            >
              Enterprise SSO
            </button>
          </div>
        </div>

        {/* Live Cluster Status Banner */}
        <div className="my-5 p-3 rounded-xl bg-[#F3F4F7] flex items-center justify-between font-mono text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
            <span className="text-[#222026] font-bold uppercase tracking-wide">
              Cluster ORD-01 Active
            </span>
          </div>
          <span className="text-slate-400">TLS 1.3 · FIDO2 Enforced</span>
        </div>

        {/* Auth Error Banner */}
        {authError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* TAB 1: Credentials Form */}
        {activeTab === "credentials" && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* 1-Click Demo Persona Quick Fill Bar */}
              <div className="p-3 rounded-xl bg-[#F3F4F7]/80 border border-slate-200/80 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-archivo font-bold uppercase tracking-wider text-[#222026]">
                    <Sparkles className="w-3.5 h-3.5 text-[#FD3706]" />
                    <span>Quick Demo Accounts</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">1-Click Auto Fill</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {DEMO_ACCOUNTS.map((demo) => {
                    const isSelected = activePersona === demo.email;
                    return (
                      <button
                        key={demo.email}
                        type="button"
                        onClick={() => handleSelectDemoAccount(demo)}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col ${
                          isSelected
                            ? "bg-white border-[#FD3706] text-[#FD3706] shadow-xs"
                            : "bg-white/70 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <span className="font-archivo text-xs font-bold truncate leading-tight">
                          {demo.tag}
                        </span>
                        <span className="font-mono text-[9px] text-slate-400 truncate mt-0.5">
                          {demo.company}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Email / Dispatch ID */}
              <FormField
                control={form.control}
                name="userEmail"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="font-mono text-xs font-semibold uppercase tracking-wider text-[#222026]">
                      Work Email / Dispatch ID
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          {...field}
                          type="email"
                          placeholder="operator-id@mesh-scm.io"
                          className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#F3F4F7] text-[#222026] font-mono text-xs border border-transparent focus:bg-white focus:border-[#FD3706] outline-none transition-all"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-red-600 font-mono" />
                  </FormItem>
                )}
              />

              {/* Master Password */}
              <FormField
                control={form.control}
                name="userPassword"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-mono text-xs font-semibold uppercase tracking-wider text-[#222026]">
                        Master Password / Security Token
                      </FormLabel>
                      <button
                        type="button"
                        onClick={() => setIsOverrideModalOpen(true)}
                        className="font-mono text-[11px] text-[#FD3706] hover:underline font-semibold"
                      >
                        Forgot Master Key?
                      </button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter secure passphrase"
                          className="w-full h-11 pl-10 pr-11 rounded-xl bg-[#F3F4F7] text-[#222026] font-mono text-xs border border-transparent focus:bg-white focus:border-[#FD3706] outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#222026] p-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-red-600 font-mono" />
                  </FormItem>
                )}
              />

              {/* Depot Node / Hub Facility Selector */}
              <div className="space-y-1.5">
                <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-[#222026]">
                  Depot Node / Hub Facility
                </label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedHub}
                    onChange={(e) => setSelectedHub(e.target.value)}
                    className="w-full h-11 pl-10 pr-9 rounded-xl bg-[#F3F4F7] text-[#222026] font-mono text-xs border border-transparent focus:bg-white focus:border-[#FD3706] appearance-none outline-none cursor-pointer transition-all"
                  >
                    <option value="ORD-01">ORD-01 Chicago Air Freight & Cross-Dock (Primary Node)</option>
                    <option value="DFW-04">DFW-04 Dallas Intra-Modal High Speed Rail Depot</option>
                    <option value="LAX-09">LAX-09 Long Beach Deepwater Marine Terminal</option>
                    <option value="EWR-02">EWR-02 Newark Global Intermodal Gateway</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Workstation Shift Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberShift}
                    onChange={(e) => setRememberShift(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#FD3706] cursor-pointer"
                  />
                  <span className="font-sans text-xs text-slate-700">
                    Remember workstation for 12h operational shift
                  </span>
                </label>
                <span className="font-mono text-[11px] text-slate-400">Idle timeout: 15m</span>
              </div>

              {/* Primary Submit Button from Stitch */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="w-full h-12 rounded-xl bg-[#FD3706] hover:bg-[#E02E00] text-white font-archivo text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Verifying Cryptographic Tokens...</span>
                    </>
                  ) : (
                    <>
                      <span>Authenticate & Enter Gateway</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </Form>
        )}

        {/* TAB 2: Enterprise SSO from Stitch */}
        {activeTab === "sso" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#F3F4F7] text-[#222026] space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FD3706]" />
                <span className="font-archivo text-xs font-bold uppercase text-[#222026]">
                  Federated Identity Directory
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Authenticate through your corporate identity provider. Okta, Azure AD, and Google Workspace are pre-configured for automated depot role assignments.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  toast({
                    title: "Okta Enterprise SSO",
                    description: "Redirecting to corporate identity provider...",
                  });
                }}
                className="w-full h-12 rounded-xl bg-[#222026] hover:bg-[#19171C] text-white font-archivo text-xs font-semibold flex items-center justify-between px-4 transition-all shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-[#222026] font-bold text-xs font-archivo">
                    O
                  </span>
                  <span>Sign in via Okta Enterprise SSO</span>
                </div>
                <span className="font-mono text-[10px] text-slate-300">SAML 2.0</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toast({
                    title: "Microsoft Entra ID",
                    description: "Initiating OIDC enterprise flow...",
                  });
                }}
                className="w-full h-12 rounded-xl bg-[#F3F4F7] hover:bg-slate-200 text-[#222026] font-archivo text-xs font-semibold flex items-center justify-between px-4 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-slate-600" />
                  <span>Sign in via Microsoft Entra ID (Azure AD)</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">OIDC Direct</span>
              </button>
            </div>

            <div className="p-3 bg-[#F3F4F7] rounded-xl flex items-center justify-between font-mono text-[11px] text-slate-500">
              <span>SCIM 2.0 Auto-Provisioning Active</span>
              <span className="text-[#059669] font-semibold">Tenant Verified</span>
            </div>
          </div>
        )}

        {/* Bottom Status Policy & Override Trigger from Stitch */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-slate-400 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>Strict Mutual TLS Policy</span>
          </div>
          <button
            type="button"
            onClick={() => setIsOverrideModalOpen(true)}
            className="text-[#FD3706] hover:underline font-semibold uppercase flex items-center gap-1 cursor-pointer"
          >
            <span>Override Support</span>
            <Headphones className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Emergency NOC Override Modal from Stitch */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#FD3706]" />
                <h3 className="font-archivo text-base font-bold uppercase text-[#222026]">
                  Emergency Override Channel
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-slate-400 hover:text-[#222026] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              In the event of hardware MFA desynchronization, token loss, or facility lockdown, contact the 24/7 Global Dispatch NOC operations team immediately:
            </p>

            <div className="p-3.5 rounded-xl bg-[#F3F4F7] font-mono text-xs text-[#222026] font-bold text-center border border-slate-200 flex items-center justify-center gap-2">
              <PhoneCall className="w-4 h-4 text-[#FD3706]" />
              <span>DISPATCH NOC: +1 (800) 555-MESH-911</span>
            </div>

            <button
              type="button"
              onClick={() => setIsOverrideModalOpen(false)}
              className="w-full h-10 rounded-xl bg-[#222026] text-white font-archivo text-xs font-semibold uppercase tracking-wider hover:bg-[#19171C] transition-colors cursor-pointer"
            >
              Acknowledge & Return
            </button>
          </div>
        </div>
      )}
    </>
  );
}
