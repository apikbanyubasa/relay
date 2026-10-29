"use client";

import {
  Briefcase,
  CalendarCheck,
  ChevronDown,
  LogOut,
  Settings,
  ShieldAlert,
  User as UserIcon,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isBoard = pathname === "/";
  const isStandup = pathname === "/standup";
  const isTeamAdmin = pathname.startsWith("/admin/users");
  const isSettings = pathname === "/settings";

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return {
          label: "Super Admin",
          color: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
        };
      case "PRODUCT_MANAGER":
        return {
          label: "Product Manager",
          color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
        };
      case "INTERNAL_TEAM":
        return {
          label: user?.department || "Internal Engineer",
          color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
        };
      case "CLIENT_GUEST":
        return {
          label: "Client Guest",
          color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        };
      default:
        return {
          label: "Guest",
          color: "bg-slate-800 text-slate-400 border-slate-700",
        };
    }
  };

  const badge = getRoleBadge(user?.role);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex flex-col">
              <div className="font-extrabold text-lg tracking-tight flex items-center gap-1 leading-none">
                <span className="text-slate-100 group-hover:text-white transition-colors">
                  Relay
                </span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mt-1 group-hover:text-slate-300 transition-colors">
                Task Engine
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            <Link
              href="/"
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 border ${
                isBoard
                  ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-sm shadow-cyan-500/10 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent"
              }`}
            >
              <Briefcase
                className={`w-4 h-4 ${isBoard ? "text-cyan-400" : "text-slate-400"}`}
              />
              <span>Task Board</span>
            </Link>

            {user?.role !== "CLIENT_GUEST" && (
              <Link
                href="/standup"
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 border ${
                  isStandup
                    ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-sm shadow-indigo-500/10 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent"
                }`}
              >
                <CalendarCheck
                  className={`w-4 h-4 ${isStandup ? "text-indigo-400" : "text-slate-400"}`}
                />
                <span>Standup Summary</span>
              </Link>
            )}

            {user?.role === "SUPER_ADMIN" && (
              <Link
                href="/admin/users"
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 border ${
                  isTeamAdmin
                    ? "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30 shadow-sm shadow-fuchsia-500/10 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent"
                }`}
              >
                <Users
                  className={`w-4 h-4 ${isTeamAdmin ? "text-fuchsia-400" : "text-slate-400"}`}
                />
                <span>Team Management</span>
              </Link>
            )}
          </nav>
        </div>

        {/* User Info & Quick Menu */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 p-1.5 pr-2.5 rounded-2xl hover:bg-slate-900/80 border border-transparent hover:border-slate-800 transition-all cursor-pointer group"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {user.name}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center justify-end gap-1.5 mt-0.5">
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-medium ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-800 group-hover:ring-cyan-500/40 transition-all"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:border-cyan-500/40 transition-all">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    isUserMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/95 border border-slate-800/90 shadow-2xl backdrop-blur-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Profile header */}
                  <div className="px-4 py-3 border-b border-slate-800/80">
                    <p className="text-xs text-slate-400 font-medium">
                      Signed in as
                    </p>
                    <p className="text-sm font-bold text-slate-100 truncate mt-0.5">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {user.email}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-medium ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                      {user.department && (
                        <span className="px-2 py-0.5 rounded-md border border-slate-800 bg-slate-950 text-[10px] font-medium text-slate-400">
                          {user.department}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Navigation Links inside dropdown */}
                  <div className="p-1.5 space-y-1">
                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 transition-colors ${
                        isSettings
                          ? "bg-cyan-500/15 text-cyan-300 font-semibold"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <Settings className="w-4 h-4 text-cyan-400" />
                      <span>Account Settings</span>
                    </Link>

                    {user.role === "SUPER_ADMIN" && (
                      <Link
                        href="/admin/users"
                        onClick={() => setIsUserMenuOpen(false)}
                        className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 transition-colors ${
                          isTeamAdmin
                            ? "bg-fuchsia-500/15 text-fuchsia-300 font-semibold"
                            : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                        }`}
                      >
                        <ShieldAlert className="w-4 h-4 text-fuchsia-400" />
                        <span>Team Management</span>
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-slate-800/80 my-1" />

                  {/* Logout Button */}
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-2.5 cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
