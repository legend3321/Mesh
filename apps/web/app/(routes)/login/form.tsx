"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
  CheckCircle2,
} from "lucide-react";
import MeshLogoSvg from "@/app/components/MeshLogoSvg";

const FormSchema = z.object({
  userEmail: z.string().email({
    message: "Please enter a valid corporate email address.",
  }),
  userPassword: z.string().min(5, {
    message: "Password must be at least 6 characters.",
  }),
});

type FormData = z.infer<typeof FormSchema>;

export const DEMO_ACCOUNTS = [
  {
    company: "Apex Logistics",
    companyCode: "APEX-01",
    role: "ADMIN",
    name: "Ujjwal Chaudhary",
    email: "admin@mesh.com",
    password: "admin123",
    tag: "Apex Corp Super-Admin",
    accent: "from-blue-600 to-indigo-600",
  },
  {
    company: "Apex Logistics",
    companyCode: "APEX-01",
    role: "MANAGER",
    name: "Alex Turner",
    email: "manager@mesh.com",
    password: "admin123",
    tag: "Apex Operations Lead",
    accent: "from-cyan-600 to-blue-600",
  },
  {
    company: "Starlight Retail",
    companyCode: "STAR-02",
    role: "ADMIN",
    name: "Elena Rostova",
    email: "starlight.admin@mesh.com",
    password: "admin123",
    tag: "Starlight Global Admin",
    accent: "from-purple-600 to-pink-600",
  },
  {
    company: "Starlight Retail",
    companyCode: "STAR-02",
    role: "STAFF",
    name: "Chloe Bennett",
    email: "starlight.staff@mesh.com",
    password: "admin123",
    tag: "Starlight Operations Staff",
    accent: "from-amber-600 to-orange-600",
  },
];

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activePersona, setActivePersona] = useState<string | null>("admin@mesh.com");

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userEmail: "admin@mesh.com",
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
      description: `Loaded ${demo.name} (${demo.role}) for ${demo.company} (${demo.companyCode}).`,
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
        setAuthError("Invalid corporate email or password. Please verify your credentials.");
        toast({
          title: "Authentication Failed",
          description: "Could not authenticate with provided credentials.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Authentication Successful",
        description: "Launching Mesh Enterprise Command Center...",
      });

      router.push("/dashboard");
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
    <div className="w-full max-w-md mx-auto">
      {/* Mobile Branding Header (visible only on smaller screens) */}
      <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-white shadow-xs">
          <MeshLogoSvg size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Mesh
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
              v2.4
            </span>
          </h1>
          <p className="text-xs text-slate-400">Enterprise Supply Chain Platform</p>
        </div>
      </div>

      {/* Main Glassmorphic Form Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-8">
        {/* Card Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Multi-Tenant Portal
            </span>
            <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              API Gateway Ready
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Sign In to Workspace
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authenticate to access isolated corporate ledgers, inventory hubs, and real-time telemetry.
          </p>
        </div>

        {/* 1-Click Demo Persona Selector */}
        <div className="mb-6 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <p className="text-xs font-semibold text-slate-200">
                1-Click Quick Demo Accounts
              </p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Instant Fill</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((demo) => {
              const isSelected = activePersona === demo.email;
              return (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => handleSelectDemoAccount(demo)}
                  className={`flex flex-col text-left p-2.5 rounded-lg border transition-all text-xs relative group ${
                    isSelected
                      ? "bg-blue-600/20 border-blue-500/60 text-white shadow-xs"
                      : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-white truncate max-w-[90px]">
                      {demo.company}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1 py-0.2 rounded font-mono ${
                        demo.role === "ADMIN"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : demo.role === "MANAGER"
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {demo.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate w-full">
                    {demo.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono truncate w-full mt-0.5">
                    {demo.email}
                  </p>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Auth Error Banner */}
        {authError && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        {/* Credentials Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="userEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Corporate Email</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      e.g. admin@mesh.com
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        {...field}
                        type="email"
                        placeholder="yourname@organization.com"
                        className="pl-10 bg-slate-950/80 border-slate-700/80 text-white placeholder:text-slate-600 focus-visible:ring-blue-500 focus-visible:border-blue-500 rounded-xl h-11 text-sm"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />

            {/* Password Field */}
            <FormField
              control={form.control}
              name="userPassword"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-semibold text-slate-300">
                      Password
                    </FormLabel>
                    <button
                      type="button"
                      onClick={() =>
                        toast({
                          title: "Default Password",
                          description: "All demo accounts use password: 'admin123'",
                        })
                      }
                      className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        className="pl-10 pr-10 bg-slate-950/80 border-slate-700/80 text-white placeholder:text-slate-600 focus-visible:ring-blue-500 focus-visible:border-blue-500 rounded-xl h-11 text-sm font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />

            {/* Remember Me Option */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 w-3.5 h-3.5"
                />
                <span>Remember session for this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/25 gap-2 mt-2"
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Card Footer Security Tag */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            Apex &bull; Starlight Multi-Tenant
          </span>
          <span className="flex items-center gap-1 text-emerald-400/90 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            256-Bit SSL Enforced
          </span>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
