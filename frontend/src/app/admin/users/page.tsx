"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "../../../components/ui/Navbar";
import { apiClient } from "../../../lib/api-client";
import { useAuthStore } from "../../../store/useAuthStore";
import type {
  ApiResponse,
  CreateUserPayload,
  Department,
  Role,
  UpdateUserPayload,
  User,
} from "../../../types";

export default function UserManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    user: currentUser,
    isLoading: authLoading,
    initialize,
  } = useAuthStore();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Forms state
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    email: "",
    name: "",
    password: "",
    role: "INTERNAL_TEAM",
    department: "FRONTEND",
    avatar_url: "",
  });
  const [editForm, setEditForm] = useState<UpdateUserPayload>({
    name: "",
    email: "",
    role: "INTERNAL_TEAM",
    department: "FRONTEND",
    avatar_url: "",
  });
  const [adminNewPassword, setAdminNewPassword] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Debounce search term (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Auth redirection check
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login");
    }
  }, [authLoading, currentUser, router]);

  // Fetch Users List
  const {
    data: usersResponse,
    isLoading: isUsersLoading,
    isError: isUsersError,
    error: usersError,
    refetch,
  } = useQuery({
    queryKey: ["users", debouncedSearch, selectedRole, selectedDepartment],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", "50");
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (selectedRole !== "ALL") params.append("role", selectedRole);
      if (selectedDepartment !== "ALL")
        params.append("department", selectedDepartment);

      const res = await apiClient.get<ApiResponse<User[]>>(
        `/api/users?${params.toString()}`,
      );
      return res.data;
    },
    enabled: !!currentUser && currentUser.role === "SUPER_ADMIN",
  });

  const users = useMemo(() => usersResponse?.data || [], [usersResponse]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = users.length;
    const superAdmins = users.filter((u) => u.role === "SUPER_ADMIN").length;
    const pms = users.filter((u) => u.role === "PRODUCT_MANAGER").length;
    const engineers = users.filter((u) => u.role === "INTERNAL_TEAM").length;
    const clients = users.filter((u) => u.role === "CLIENT_GUEST").length;
    return { total, superAdmins, pms, engineers, clients };
  }, [users]);

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const res = await apiClient.post<ApiResponse<User>>("/api/users", {
        ...payload,
        avatar_url: payload.avatar_url || null,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsCreateModalOpen(false);
      setCreateForm({
        email: "",
        name: "",
        password: "",
        role: "INTERNAL_TEAM",
        department: "FRONTEND",
        avatar_url: "",
      });
      setFormError(null);
      setActionSuccessMsg(`User "${data.data.name}" successfully created!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    },
    onError: (err: unknown) => {
      if (isAxiosError<ApiResponse<unknown>>(err)) {
        setFormError(
          err.response?.data?.error?.message || "Failed to create user.",
        );
      } else {
        setFormError("Failed to create user.");
      }
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateUserPayload;
    }) => {
      const res = await apiClient.patch<ApiResponse<User>>(`/api/users/${id}`, {
        ...payload,
        avatar_url: payload.avatar_url || null,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(null);
      setFormError(null);
      setActionSuccessMsg(`User "${data.data.name}" successfully updated!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    },
    onError: (err: unknown) => {
      if (isAxiosError<ApiResponse<unknown>>(err)) {
        setFormError(
          err.response?.data?.error?.message || "Failed to update user.",
        );
      } else {
        setFormError("Failed to update user.");
      }
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<ApiResponse<{ message: string }>>(
        `/api/users/${id}`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeletingUser(null);
      setActionSuccessMsg("User account successfully deactivated.");
      setTimeout(() => setActionSuccessMsg(null), 4000);
    },
    onError: (err: unknown) => {
      if (isAxiosError<ApiResponse<unknown>>(err)) {
        alert(
          err.response?.data?.error?.message || "Failed to deactivate user.",
        );
      } else {
        alert("Failed to deactivate user.");
      }
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({
      id,
      newPassword,
    }: {
      id: string;
      newPassword: string;
    }) => {
      const res = await apiClient.post<ApiResponse<{ message: string }>>(
        `/api/users/${id}/reset-password`,
        { newPassword },
      );
      return res.data;
    },
    onSuccess: () => {
      setResetPasswordUser(null);
      setAdminNewPassword("");
      setActionSuccessMsg("User password successfully reset.");
      setTimeout(() => setActionSuccessMsg(null), 4000);
    },
    onError: (err: unknown) => {
      if (isAxiosError<ApiResponse<unknown>>(err)) {
        setFormError(
          err.response?.data?.error?.message || "Failed to reset password.",
        );
      } else {
        setFormError("Failed to reset password.");
      }
    },
  });

  // Access Control Guard
  if (!authLoading && currentUser && currentUser.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 shadow-xl shadow-rose-500/10">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Restricted Administrator Zone
          </h1>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Only Super Administrators can create, modify, or deactivate company
            user accounts. Your current role is{" "}
            <span className="font-semibold text-slate-200">
              {currentUser.role}
            </span>
            .
          </p>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm transition-all"
          >
            Return to Task Board
          </Link>
        </div>
      </div>
    );
  }

  const getRoleBadge = (role: Role) => {
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
          label: "Internal Engineer",
          color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
        };
      case "CLIENT_GUEST":
        return {
          label: "Client Guest",
          color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        };
      default:
        return {
          label: role,
          color: "bg-slate-800 text-slate-300 border-slate-700",
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header & Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fuchsia-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Enterprise RBAC Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Team & User Management
            </h1>
            <p className="text-sm text-slate-400">
              Create and orchestrate organizational accounts, assign roles, and
              manage system privileges.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-fuchsia-600/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {actionSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Total Users
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {metrics.total}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fuchsia-400">
              Super Admins
            </p>
            <p className="text-2xl font-bold text-fuchsia-300 mt-1">
              {metrics.superAdmins}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
              Product Managers
            </p>
            <p className="text-2xl font-bold text-indigo-300 mt-1">
              {metrics.pms}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
              Internal Engineers
            </p>
            <p className="text-2xl font-bold text-cyan-300 mt-1">
              {metrics.engineers}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl col-span-2 sm:col-span-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Client Guests
            </p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">
              {metrics.clients}
            </p>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="PRODUCT_MANAGER">Product Manager</option>
              <option value="INTERNAL_TEAM">Internal Team</option>
              <option value="CLIENT_GUEST">Client Guest</option>
            </select>

            {/* Department Filter */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              <option value="MANAGEMENT">MANAGEMENT</option>
              <option value="PRODUCT">PRODUCT</option>
              <option value="FRONTEND">FRONTEND</option>
              <option value="BACKEND">BACKEND</option>
              <option value="UI_UX">UI_UX</option>
              <option value="EXTERNAL">EXTERNAL</option>
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => refetch()}
              title="Refresh User List"
              className="p-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
          {/* Loading State */}
          {isUsersLoading && (
            <div className="p-8 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading user accounts...</p>
            </div>
          )}

          {/* Error State */}
          {isUsersError && !isUsersLoading && (
            <div className="p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-sm font-semibold text-rose-300">
                Failed to load users
              </p>
              <p className="text-xs text-slate-400">
                {usersError instanceof Error
                  ? usersError.message
                  : "An unexpected error occurred."}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isUsersLoading && !isUsersError && users.length === 0 && (
            <div className="p-12 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                No users found
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No account matches your current search or filter query. Try
                adjusting or clearing your filters.
              </p>
              {(debouncedSearch ||
                selectedRole !== "ALL" ||
                selectedDepartment !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedRole("ALL");
                    setSelectedDepartment("ALL");
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Success State: Table */}
          {!isUsersLoading && !isUsersError && users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4 sm:px-6">Member Profile</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">
                      Deliverables
                    </th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {users.map((u) => {
                    const badge = getRoleBadge(u.role);
                    const isSelf = currentUser?.id === u.id;

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Member Profile */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt={u.name}
                                className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-800 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                                <UserIcon className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                <span className="truncate">{u.name}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md border border-slate-800 bg-slate-950 text-[11px] font-medium text-slate-300">
                            {u.department}
                          </span>
                        </td>

                        {/* Workload */}
                        <td className="py-3.5 px-4 whitespace-nowrap hidden md:table-cell text-slate-400">
                          {u._count?.assigned_tasks !== undefined ? (
                            <span>
                              <span className="font-semibold text-slate-200">
                                {u._count.assigned_tasks}
                              </span>{" "}
                              tasks assigned
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser(u);
                                setEditForm({
                                  name: u.name,
                                  email: u.email,
                                  role: u.role,
                                  department: u.department,
                                  avatar_url: u.avatar_url || "",
                                });
                                setFormError(null);
                              }}
                              title="Edit user details"
                              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Password */}
                            <button
                              type="button"
                              onClick={() => {
                                setResetPasswordUser(u);
                                setAdminNewPassword("");
                                setFormError(null);
                              }}
                              title="Reset user password"
                              className="p-2 rounded-xl text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Deactivate/Delete */}
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => setDeletingUser(u)}
                              title={
                                isSelf
                                  ? "Cannot delete your own account"
                                  : "Deactivate user"
                              }
                              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                                isSelf
                                  ? "text-slate-700 cursor-not-allowed opacity-40"
                                  : "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================= */}
      {/* 1. CREATE USER MODAL */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Plus className="w-5 h-5 text-fuchsia-400" />
                <span>Create New Account</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUserMutation.mutate(createForm);
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="create_user_name"
                  className="text-xs font-semibold text-slate-300 mb-1 block"
                >
                  Full Name
                </label>
                <input
                  id="create_user_name"
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              <div>
                <label
                  htmlFor="create_user_email"
                  className="text-xs font-semibold text-slate-300 mb-1 block"
                >
                  Email Address
                </label>
                <input
                  id="create_user_email"
                  type="email"
                  required
                  placeholder="name@relay.id"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="create_user_role"
                    className="text-xs font-semibold text-slate-300 mb-1 block"
                  >
                    Role
                  </label>
                  <select
                    id="create_user_role"
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        role: e.target.value as Role,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-fuchsia-500"
                  >
                    <option value="INTERNAL_TEAM">INTERNAL_TEAM</option>
                    <option value="PRODUCT_MANAGER">PRODUCT_MANAGER</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    <option value="CLIENT_GUEST">CLIENT_GUEST</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="create_user_dept"
                    className="text-xs font-semibold text-slate-300 mb-1 block"
                  >
                    Department
                  </label>
                  <select
                    id="create_user_dept"
                    value={createForm.department}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        department: e.target.value as Department,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-fuchsia-500"
                  >
                    <option value="FRONTEND">FRONTEND</option>
                    <option value="BACKEND">BACKEND</option>
                    <option value="UI_UX">UI_UX</option>
                    <option value="PRODUCT">PRODUCT</option>
                    <option value="MANAGEMENT">MANAGEMENT</option>
                    <option value="EXTERNAL">EXTERNAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="create_user_password"
                  className="text-xs font-semibold text-slate-300 mb-1 block"
                >
                  Initial Password (min. 8 characters)
                </label>
                <input
                  id="create_user_password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Password123!"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              <div>
                <label
                  htmlFor="create_user_avatar"
                  className="text-xs font-semibold text-slate-300 mb-1 block"
                >
                  Avatar URL (Optional)
                </label>
                <input
                  id="create_user_avatar"
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={createForm.avatar_url || ""}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      avatar_url: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {createUserMutation.isPending
                    ? "Creating..."
                    : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. EDIT USER MODAL */}
      {/* ========================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Edit2 className="w-5 h-5 text-cyan-400" />
                <span>Edit User Profile: {editingUser.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateUserMutation.mutate({
                  id: editingUser.id,
                  payload: editForm,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="edit_user_name"
                  className="text-xs font-semibold text-slate-300 mb-1 block"
                >
                  Full Name
                </label>
                <input
                  id="edit_user_name"
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label
                  htmlFor="edit_user_email"
                  className="text-xs font-semibold text-slate-300 mb-1 block"
                >
                  Email Address
                </label>
                <input
                  id="edit_user_email"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit_user_role"
                    className="text-xs font-semibold text-slate-300 mb-1 block"
                  >
                    Role
                  </label>
                  <select
                    id="edit_user_role"
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        role: e.target.value as Role,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="INTERNAL_TEAM">INTERNAL_TEAM</option>
                    <option value="PRODUCT_MANAGER">PRODUCT_MANAGER</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    <option value="CLIENT_GUEST">CLIENT_GUEST</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit_user_dept"
                    className="text-xs font-semibold text-slate-300 mb-1 block"
                  >
                    Department
                  </label>
                  <select
                    id="edit_user_dept"
                    value={editForm.department}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        department: e.target.value as Department,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="FRONTEND">FRONTEND</option>
                    <option value="BACKEND">BACKEND</option>
                    <option value="UI_UX">UI_UX</option>
                    <option value="PRODUCT">PRODUCT</option>
                    <option value="MANAGEMENT">MANAGEMENT</option>
                    <option value="EXTERNAL">EXTERNAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit_user_avatar"
                  className="text-xs font-semibold text-slate-300 mb-1 block"
                >
                  Avatar Image URL
                </label>
                <input
                  id="edit_user_avatar"
                  type="url"
                  placeholder="https://..."
                  value={editForm.avatar_url || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, avatar_url: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. RESET PASSWORD MODAL */}
      {/* ========================================================= */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <span>Reset Password</span>
              </div>
              <button
                type="button"
                onClick={() => setResetPasswordUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter a new password for{" "}
              <strong className="text-slate-200">
                {resetPasswordUser.name}
              </strong>{" "}
              ({resetPasswordUser.email}).
            </p>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (adminNewPassword.length < 8) {
                  setFormError("Password must be at least 8 characters long.");
                  return;
                }
                resetPasswordMutation.mutate({
                  id: resetPasswordUser.id,
                  newPassword: adminNewPassword,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="admin_reset_password"
                  className="text-xs font-semibold text-slate-300 mb-1 block"
                >
                  New Password (min. 8 characters)
                </label>
                <input
                  id="admin_reset_password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {resetPasswordMutation.isPending
                    ? "Resetting..."
                    : "Confirm Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. DEACTIVATE USER CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                Deactivate User Account?
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Are you sure you want to deactivate{" "}
                <strong className="text-slate-200">{deletingUser.name}</strong>{" "}
                ({deletingUser.email})? The user will no longer be able to log
                in. Historic task deliverables and audit logs will remain
                preserved.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteUserMutation.isPending}
                onClick={() => deleteUserMutation.mutate(deletingUser.id)}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs sm:text-sm disabled:opacity-50 cursor-pointer shadow-md"
              >
                {deleteUserMutation.isPending
                  ? "Deactivating..."
                  : "Deactivate User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
