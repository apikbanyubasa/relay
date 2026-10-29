"use client";

import { isAxiosError } from "axios";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Save,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "../../components/ui/Navbar";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../store/useAuthStore";
import type { ApiResponse, User } from "../../types";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, setAuth, isLoading: authLoading, initialize } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  // Profile Form State
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(
    null,
  );
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Security Form State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [securitySuccessMsg, setSecuritySuccessMsg] = useState<string | null>(
    null,
  );
  const [securityErrorMsg, setSecurityErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      setName(user.name);
      setAvatarUrl(user.avatar_url || "");
    }
  }, [authLoading, user, router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const res = await apiClient.patch<ApiResponse<User>>(
        "/api/users/profile",
        {
          name: name.trim(),
          avatar_url: avatarUrl.trim() || null,
        },
      );

      if (res.data?.success && res.data?.data) {
        setAuth(res.data.data);
        setProfileSuccessMsg("Profile information successfully updated!");
        setTimeout(() => setProfileSuccessMsg(null), 4000);
      }
    } catch (err: unknown) {
      if (isAxiosError<ApiResponse<unknown>>(err)) {
        setProfileErrorMsg(
          err.response?.data?.error?.message || "Failed to update profile.",
        );
      } else {
        setProfileErrorMsg("An unexpected error occurred.");
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecuritySuccessMsg(null);
    setSecurityErrorMsg(null);

    if (newPassword.length < 8) {
      setSecurityErrorMsg("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityErrorMsg("New password confirmation does not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await apiClient.put<ApiResponse<{ message: string }>>(
        "/api/users/change-password",
        {
          oldPassword,
          newPassword,
        },
      );

      if (res.data?.success) {
        setSecuritySuccessMsg(
          "Your password has been changed successfully. Use it on your next login.",
        );
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setSecuritySuccessMsg(null), 5000);
      }
    } catch (err: unknown) {
      if (isAxiosError<ApiResponse<unknown>>(err)) {
        setSecurityErrorMsg(
          err.response?.data?.error?.message || "Failed to change password.",
        );
      } else {
        setSecurityErrorMsg("An unexpected error occurred.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  const sampleAvatars = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
    "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150",
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Page Title & Breadcrumb */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
            <UserIcon className="w-3.5 h-3.5" />
            <span>Account Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Account & Profile Settings
          </h1>
          <p className="text-sm text-slate-400">
            Manage your personal profile details, avatar representation, and
            login credentials.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-px">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all flex items-center gap-2 border-b-2 -mb-px cursor-pointer ${
              activeTab === "profile"
                ? "border-cyan-400 text-cyan-300 bg-cyan-500/10"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Personal Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all flex items-center gap-2 border-b-2 -mb-px cursor-pointer ${
              activeTab === "security"
                ? "border-cyan-400 text-cyan-300 bg-cyan-500/10"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Security & Password</span>
          </button>
        </div>

        {/* TAB 1: PROFILE SETTINGS */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Avatar & Role Summary Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col items-center text-center space-y-4">
              <div className="relative group">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-24 h-24 rounded-2xl object-cover ring-4 ring-slate-800 shadow-xl"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-300 shadow-xl">
                    <UserIcon className="w-10 h-10" />
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-lg font-bold text-white">{user.name}</h2>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>

              <div className="w-full pt-4 border-t border-slate-800/80 space-y-2 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Assigned Role:</span>
                  <span className="font-semibold text-slate-200">
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Department:</span>
                  <span className="font-semibold text-slate-200">
                    {user.department}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs text-left flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Roles & departments are governed centrally by the Organization
                  Super Administrator.
                </p>
              </div>
            </div>

            {/* Right Column: Edit Profile Form */}
            <div className="md:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
              {profileSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="profile_name"
                    className="text-xs font-semibold text-slate-300 mb-1.5 block"
                  >
                    Full Name
                  </label>
                  <input
                    id="profile_name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    placeholder="Your legal or display name"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                {/* Email Address (Read-only) */}
                <div>
                  <label
                    htmlFor="profile_email"
                    className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between"
                  >
                    <span>Work Email Address</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Managed by Organization
                    </span>
                  </label>
                  <input
                    id="profile_email"
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full bg-slate-950/40 border border-slate-800/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>

                {/* Avatar URL */}
                <div>
                  <label
                    htmlFor="profile_avatar"
                    className="text-xs font-semibold text-slate-300 mb-1.5 block"
                  >
                    Avatar Image URL
                  </label>
                  <input
                    id="profile_avatar"
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Provide a direct link to any high-resolution profile
                    picture, or pick a sample preset below:
                  </p>

                  {/* Sample Avatars Picker */}
                  <div className="flex items-center gap-2 mt-2.5">
                    {sampleAvatars.map((url, i) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setAvatarUrl(url)}
                        title={`Sample Avatar ${i + 1}`}
                        className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          avatarUrl === url
                            ? "border-cyan-400 ring-2 ring-cyan-500/20"
                            : "border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={url}
                          alt="Preset avatar"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl("")}
                        className="text-[11px] text-rose-400 hover:text-rose-300 ml-2 cursor-pointer font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-cyan-500/20 active:scale-98 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingProfile ? "Saving Changes..." : "Save Profile"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: SECURITY & PASSWORD SETTINGS */}
        {activeTab === "security" && (
          <div className="max-w-2xl bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                <span>Change Password</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Protect your account by setting a strong, unique password with
                at least 8 characters.
              </p>
            </div>

            {securitySuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{securitySuccessMsg}</span>
              </div>
            )}

            {securityErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{securityErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label
                  htmlFor="old_password"
                  className="text-xs font-semibold text-slate-300 mb-1.5 block"
                >
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="old_password"
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showOldPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label
                  htmlFor="new_password"
                  className="text-xs font-semibold text-slate-300 mb-1.5 block"
                >
                  New Password (min. 8 characters)
                </label>
                <div className="relative">
                  <input
                    id="new_password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label
                  htmlFor="confirm_password"
                  className="text-xs font-semibold text-slate-300 mb-1.5 block"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat new password"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-cyan-500/20 active:scale-98 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>
                    {isChangingPassword
                      ? "Updating Password..."
                      : "Update Password"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
