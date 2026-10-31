"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Building,
  ChevronDown,
  Globe,
  KeyRound,
  AlertCircle,
  X,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Headphones,
  PhoneCall,
  CheckCircle2,
  Radio,
  Layers,
  Plane,
} from "lucide-react";

const FormSchema = z.object({
  userEmail: z.string().email({
    message: "Enter a valid corporate email address",
  }),
  userPassword: z.string().min(5, {
    message: "Password must be at least 6 characters",
  }),
});

type FormData = z.infer<typeof FormSchema>;

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [selectedHub, setSelectedHub] = useState("ORD-01");
  const [rememberShift, setRememberShift] = useState(true);
  const [ssoLoading, setSsoLoading] = useState<string | null>(null);
  const [isSamlOpen, setIsSamlOpen] = useState(false);
  const [samlDomain, setSamlDomain] = useState("");
  const supportModalRef = useRef<HTMLDivElement>(null);

  // Accessible Escape listener & Focus Trap for Support Modal
  useEffect(() => {
    if (!isSupportModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSupportModalOpen(false);
        return;
      }

      if (e.key === "Tab" && supportModalRef.current) {
        const focusableElements = supportModalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const prevActiveElement = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      if (supportModalRef.current) {
        const focusableElements = supportModalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      prevActiveElement?.focus();
    };
  }, [isSupportModalOpen]);

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userEmail: "",
      userPassword: "",
    },
  });

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
        setAuthError("Invalid credentials. Please verify your email and password.");
        toast({
          title: "Sign in failed",
          description: "Could not authenticate with provided credentials.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Signed in",
        description: "Loading your operations dashboard...",
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      console.error("Sign-in error:", error);
      setAuthError(error.message || "An unexpected error occurred during sign-in.");
      toast({
        title: "Sign-in error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSsoSignIn = async (provider: string, params?: Record<string, any>) => {
    try {
      setSsoLoading(provider);
      await signIn(provider, {
        callbackUrl: "/dashboard",
        ...params,
      });
    } catch (error: any) {
      console.error(`SSO ${provider} Error:`, error);
      toast({
        title: "Enterprise SSO initialized",
        description: error?.message || `Connecting to ${provider}...`,
      });
    } finally {
      setSsoLoading(null);
    }
  };

  const handleSamlConnect = async () => {
    if (!samlDomain.trim()) {
      toast({
        title: "Domain required",
        description: "Enter your corporate email domain (e.g. logistics.com).",
        variant: "destructive",
      });
      return;
    }
    await handleSsoSignIn("saml", { domain: samlDomain.trim() });
  };

  const fillDemoAccount = (email: string) => {
    form.setValue("userEmail", email);
    form.setValue("userPassword", "admin123");
    setAuthError(null);
  };

  return (
    <>
      <Toaster />
      <div className="w-full bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Sign-in Form (7 columns) */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="mb-6">
              <h1 className="font-archivo text-2xl font-bold tracking-tight text-zinc-900">
                Sign in
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                Enter your credentials to access the dispatch terminal
              </p>
            </div>

            {/* Quick Demo Credentials Helper */}
            <div className="mb-5 p-3 rounded-lg bg-zinc-50 border border-zinc-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-zinc-500">Quick demo access:</span>
                <span className="text-[11px] font-mono text-zinc-400">pwd: admin123</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => fillDemoAccount("admin@mesh.com")}
                  className="px-2.5 py-1 text-xs rounded-md bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400 transition-colors"
                >
                  Company Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount("superadmin@mesh.com")}
                  className="px-2.5 py-1 text-xs rounded-md bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400 transition-colors"
                >
                  Platform SuperAdmin
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount("klaus.becker@mesh.com")}
                  className="px-2.5 py-1 text-xs rounded-md bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400 transition-colors"
                >
                  Subsidiary Admin
                </button>
              </div>
            </div>

            {/* Error Notification */}
            {authError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="userEmail"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-medium text-zinc-700">
                        Work email
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                          <input
                            {...field}
                            type="email"
                            placeholder="name@company.com"
                            className="w-full h-10 pl-9 pr-3 rounded-lg bg-zinc-50 text-zinc-900 text-sm border border-zinc-200 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-colors"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-600" />
                    </FormItem>
                  )}
                />

                {/* Password Field */}
                <FormField
                  control={form.control}
                  name="userPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs font-medium text-zinc-700">
                          Password
                        </FormLabel>
                        <button
                          type="button"
                          onClick={() => setIsSupportModalOpen(true)}
                          className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                          <input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="w-full h-10 pl-9 pr-10 rounded-lg bg-zinc-50 text-zinc-900 text-sm border border-zinc-200 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label="Toggle password visibility"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-600" />
                    </FormItem>
                  )}
                />

                {/* Facility Node Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-700">
                    Assigned facility
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <select
                      value={selectedHub}
                      onChange={(e) => setSelectedHub(e.target.value)}
                      className="w-full h-10 pl-9 pr-8 rounded-lg bg-zinc-50 text-zinc-900 text-sm border border-zinc-200 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 appearance-none outline-none transition-colors cursor-pointer"
                    >
                      <option value="ORD-01">ORD-01 · Chicago Air Cargo Cross-Dock (Primary Node)</option>
                      <option value="LAX-09">LAX-09 · Long Beach Deepwater Marine Terminal</option>
                      <option value="DFW-04">DFW-04 · Dallas Rail Freight Hub</option>
                      <option value="EWR-02">EWR-02 · Newark Intermodal Gateway</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-zinc-400" />
                  </div>
                </div>

                {/* Remember Shift Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-600">
                    <input
                      type="checkbox"
                      checked={rememberShift}
                      onChange={(e) => setRememberShift(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-300 text-[#FD3706] focus:ring-0 cursor-pointer"
                    />
                    <span>Remember session for this shift</span>
                  </label>
                  <span className="text-[11px] font-mono text-zinc-400">12h session</span>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="w-full h-10 rounded-lg bg-[#FD3706] hover:bg-[#E02E00] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign in</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Form>

            {/* Enterprise SSO Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-center">
                <span className="bg-white px-3 font-mono text-[11px] text-zinc-400 uppercase tracking-wider">
                  Or continue with enterprise SSO
                </span>
              </div>
            </div>

            {/* SSO Buttons */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Okta */}
                <button
                  type="button"
                  onClick={() => handleSsoSignIn("okta")}
                  disabled={ssoLoading !== null}
                  className="h-10 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {ssoLoading === "okta" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                  ) : (
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9.5" stroke="#007DC1" strokeWidth="2.8" />
                      <circle cx="12" cy="12" r="4.2" fill="#007DC1" />
                    </svg>
                  )}
                  <span>Okta</span>
                </button>

                {/* Microsoft Entra ID */}
                <button
                  type="button"
                  onClick={() => handleSsoSignIn("azure-ad")}
                  disabled={ssoLoading !== null}
                  className="h-10 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {ssoLoading === "azure-ad" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                  ) : (
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 21 21" fill="none">
                      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                    </svg>
                  )}
                  <span>Microsoft Entra</span>
                </button>
              </div>

              {/* Corporate SAML 2.0 Disclosure */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsSamlOpen(!isSamlOpen)}
                  className="w-full h-8 px-2.5 flex items-center justify-between text-zinc-500 hover:text-zinc-800 text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Corporate SAML 2.0</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${isSamlOpen ? "rotate-180" : ""}`} />
                </button>

                {isSamlOpen && (
                  <div className="mt-2 p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-2">
                    <label className="block text-xs font-medium text-zinc-600">
                      Corporate email domain
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <input
                          type="text"
                          value={samlDomain}
                          onChange={(e) => setSamlDomain(e.target.value)}
                          placeholder="company.com"
                          className="w-full h-9 pl-8 pr-2.5 rounded-md bg-white text-zinc-900 text-xs border border-zinc-200 focus:border-zinc-900 outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSamlConnect();
                            }
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSamlConnect}
                        disabled={ssoLoading === "saml"}
                        className="h-9 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {ssoLoading === "saml" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>Connect</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Assistance Trigger */}
          <div className="mt-8 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>TLS 1.3 encrypted</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSupportModalOpen(true)}
              className="text-zinc-600 hover:text-zinc-900 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Dispatch support</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Operations Telemetry (The Moment & Signature Detail) (5 columns) */}
        <div className="lg:col-span-5 bg-zinc-900 text-zinc-100 p-6 sm:p-8 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-zinc-800">
          <div>
            {/* Telemetry Header with Signature Coordinates */}
            <div className="pb-5 border-b border-zinc-800">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-[#FD3706] font-semibold tracking-wide flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FD3706]" />
                  Live Dispatch Telemetry
                </span>
                <span className="font-mono text-[11px] text-zinc-500">
                  ORD · 41.9742° N, 87.9073° W
                </span>
              </div>
              <h2 className="font-archivo text-base font-semibold text-white mt-1">
                Terminal 04 Operations Grid
              </h2>
            </div>

            {/* Active Freight Lane Card */}
            <div className="mt-5 p-4 rounded-xl bg-zinc-800/70 border border-zinc-700/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-zinc-400">Transit Manifest</span>
                <span className="font-mono text-zinc-300 font-medium">AWB-9482-ORD</span>
              </div>

              {/* Lane Waypoints Diagram */}
              <div className="py-2">
                <div className="flex items-center justify-between text-xs font-mono font-medium text-white mb-1.5">
                  <span>ORD · Chicago</span>
                  <span className="text-zinc-400 font-normal">Flight MP-7402</span>
                  <span>AMS · Amsterdam</span>
                </div>
                <div className="relative flex items-center">
                  <div className="w-2 h-2 rounded-full bg-[#FD3706] shrink-0" />
                  <div className="flex-1 h-px bg-zinc-700 relative">
                    <div className="absolute left-1/2 -top-2 -translate-x-1/2 p-0.5 rounded bg-zinc-800 border border-zinc-600">
                      <Plane className="w-2.5 h-2.5 text-zinc-300 rotate-90" />
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-700/50 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Carrier: Apex Pacific Freight</span>
                <span className="text-emerald-400">On Schedule</span>
              </div>
            </div>

            {/* Live Throughput Metrics */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
                <span className="block font-mono text-[10px] text-zinc-400">Ledger SKUs</span>
                <span className="block font-mono text-base font-semibold text-white mt-0.5 tabular-nums">
                  11
                </span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
                <span className="block font-mono text-[10px] text-zinc-400">Buffer Safety</span>
                <span className="block font-mono text-base font-semibold text-emerald-400 mt-0.5 tabular-nums">
                  94.2%
                </span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
                <span className="block font-mono text-[10px] text-zinc-400">Velocity</span>
                <span className="block font-mono text-base font-semibold text-white mt-0.5 tabular-nums">
                  48/day
                </span>
              </div>
            </div>

            {/* Monitored Depots */}
            <div className="mt-5 space-y-2">
              <span className="block font-mono text-[11px] text-zinc-400">
                Cross-Dock Node Status
              </span>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="p-2 rounded bg-zinc-800/40 border border-zinc-700/40 flex items-center justify-between text-zinc-300">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>ORD-01 Chicago Air Freight</span>
                  </div>
                  <span className="text-zinc-400 text-[11px]">Primary Dispatch</span>
                </div>
                <div className="p-2 rounded bg-zinc-800/40 border border-zinc-700/40 flex items-center justify-between text-zinc-300">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>LAX-09 Long Beach Deepwater</span>
                  </div>
                  <span className="text-zinc-400 text-[11px]">Receiving</span>
                </div>
                <div className="p-2 rounded bg-zinc-800/40 border border-zinc-700/40 flex items-center justify-between text-zinc-300">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>RTM-03 Rotterdam European Hub</span>
                  </div>
                  <span className="text-zinc-400 text-[11px]">Cleared</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Badge in Telemetry Footer */}
          <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Mesh Multi-Tenant Protocol</span>
            <span className="text-zinc-400">FIDO2 / SSO Enforced</span>
          </div>
        </div>
      </div>

      {/* Operations Support Modal */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
          <div
            ref={supportModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dispatch-support-title"
            className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 space-y-4 border border-zinc-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-zinc-700" />
                <h3
                  id="dispatch-support-title"
                  className="font-archivo text-base font-semibold text-zinc-900"
                >
                  Dispatch Operations Support
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer transition-colors"
                title="Close modal"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              If you require access credentials, password assistance, or terminal authorization, contact the 24/7 Global Dispatch NOC operations desk:
            </p>

            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1.5 font-mono text-xs text-zinc-800">
              <div className="flex items-center gap-2 font-medium">
                <PhoneCall className="w-3.5 h-3.5 text-zinc-500" />
                <span>+1 (800) 555-6374 (Toll-Free NOC)</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500">
                <Mail className="w-3.5 h-3.5" />
                <span>dispatch-support@mesh-scm.io</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSupportModalOpen(false)}
              className="w-full h-9 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
