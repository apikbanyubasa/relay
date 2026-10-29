"use client";

import { isAxiosError } from "axios";
import { AlertCircle, ArrowRight, Layers, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../store/useAuthStore";
import type { ApiResponse } from "../../types";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await apiClient.post("/api/auth/login", {
        email,
        password,
      });

      if (res.data?.success && res.data?.data) {
        const { user, token } = res.data.data;
        setAuth(user, token);
        router.push("/");
      }
    } catch (err: unknown) {
      if (isAxiosError<ApiResponse<unknown>>(err)) {
        setErrorMessage(
          err.response?.data?.error?.message ||
            "Login failed. Please check credentials.",
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Login failed. Please check credentials.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-cyan-300 text-slate-950 font-bold shadow-xl shadow-cyan-500/20 mb-2">
            <Layers className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Relay Task Engine
          </h1>
          <p className="text-xs text-slate-400">
            Sign in to access your role-based deliverables workspace
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login_email"
                className="text-xs font-semibold text-slate-300 mb-1.5 block"
              >
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@relay.id"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login_password"
                className="text-xs font-semibold text-slate-300 mb-1.5 block"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login_password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-bold text-sm transition-all duration-200 shadow-lg shadow-cyan-500/25 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? "Authenticating..." : "Sign In"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="pt-4 border-t border-slate-800/80">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Quick Demo Accounts (Password: Password123!)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@relay.id");
                  setPassword("Password123!");
                }}
                className="p-2 rounded-xl bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 text-left transition-all text-xs group cursor-pointer"
              >
                <div className="font-semibold text-fuchsia-300 flex items-center justify-between">
                  <span>👑 Super Admin</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  admin@relay.id
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail("pm@relay.id");
                  setPassword("Password123!");
                }}
                className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-left transition-all text-xs group cursor-pointer"
              >
                <div className="font-semibold text-indigo-300 flex items-center justify-between">
                  <span>📋 Product Manager</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  pm@relay.id
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail("fe@relay.id");
                  setPassword("Password123!");
                }}
                className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-left transition-all text-xs group cursor-pointer"
              >
                <div className="font-semibold text-cyan-300 flex items-center justify-between">
                  <span>💻 Frontend Eng</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  fe@relay.id
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail("client@client.com");
                  setPassword("Password123!");
                }}
                className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left transition-all text-xs group cursor-pointer"
              >
                <div className="font-semibold text-emerald-300 flex items-center justify-between">
                  <span>👁️ Client Guest</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  client@client.com
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
