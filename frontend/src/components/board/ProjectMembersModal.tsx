"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  AlertCircle,
  Briefcase,
  Globe,
  Loader2,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../store/useAuthStore";
import type { ApiResponse, ProjectCollaborators, User } from "../../types";

interface ProjectMembersModalProps {
  projectId: string;
  projectName?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function extractErrorMessage(err: unknown, defaultMsg: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error?.message || err.message || defaultMsg;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return defaultMsg;
}

export function ProjectMembersModal({
  projectId,
  projectName,
  isOpen,
  onOpenChange,
}: ProjectMembersModalProps) {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("members");
  const [selectedInternalUserId, setSelectedInternalUserId] =
    useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // 1. Fetch current project members & clients
  const { data: collaboratorsData, isLoading: isLoadingCollaborators } =
    useQuery<ApiResponse<ProjectCollaborators>>({
      queryKey: ["project-members", projectId],
      queryFn: async () => {
        const res = await apiClient.get(`/api/projects/${projectId}/members`);
        return res.data;
      },
      enabled: isOpen && !!projectId,
    });

  // 2. Fetch all eligible assignees (internal team & PM)
  const { data: assigneesData } = useQuery<ApiResponse<User[]>>({
    queryKey: ["assignees"],
    queryFn: async () => {
      const res = await apiClient.get("/api/users/assignees");
      return res.data;
    },
    enabled: isOpen,
  });

  // 3. Fetch all eligible client guests
  const { data: clientsData } = useQuery<ApiResponse<User[]>>({
    queryKey: ["client-guests"],
    queryFn: async () => {
      const res = await apiClient.get("/api/users/clients");
      return res.data;
    },
    enabled: isOpen,
  });

  const projectMembers = collaboratorsData?.data?.members || [];
  const projectClients = collaboratorsData?.data?.clients || [];
  const allAssignees = assigneesData?.data || [];
  const allClients = clientsData?.data || [];

  // Filter candidates not yet added to this project
  const availableAssignees = allAssignees.filter(
    (u) => !projectMembers.some((m) => m.id === u.id),
  );
  const availableClients = allClients.filter(
    (c) => !projectClients.some((pc) => pc.id === c.id),
  );

  // Mutation: Add Member
  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.post(`/api/projects/${projectId}/members`, {
        user_id: userId,
      });
      return res.data;
    },
    onSuccess: () => {
      setSelectedInternalUserId("");
      setErrorMessage("");
      queryClient.invalidateQueries({
        queryKey: ["project-members", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => {
      setErrorMessage(
        extractErrorMessage(err, "Failed to add member to project"),
      );
    },
  });

  // Mutation: Remove Member
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.delete(
        `/api/projects/${projectId}/members/${userId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      setConfirmRemoveId(null);
      setErrorMessage("");
      queryClient.invalidateQueries({
        queryKey: ["project-members", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => {
      setErrorMessage(
        extractErrorMessage(err, "Failed to remove member from project"),
      );
    },
  });

  // Mutation: Add Client
  const addClientMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.post(`/api/projects/${projectId}/clients`, {
        user_id: userId,
      });
      return res.data;
    },
    onSuccess: () => {
      setSelectedClientId("");
      setErrorMessage("");
      queryClient.invalidateQueries({
        queryKey: ["project-members", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => {
      setErrorMessage(extractErrorMessage(err, "Failed to assign client"));
    },
  });

  // Mutation: Remove Client
  const removeClientMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.delete(
        `/api/projects/${projectId}/clients/${userId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      setConfirmRemoveId(null);
      setErrorMessage("");
      queryClient.invalidateQueries({
        queryKey: ["project-members", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => {
      setErrorMessage(extractErrorMessage(err, "Failed to remove client"));
    },
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInternalUserId) return;
    addMemberMutation.mutate(selectedInternalUserId);
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;
    addClientMutation.mutate(selectedClientId);
  };

  const isSubmitting =
    addMemberMutation.isPending ||
    removeMemberMutation.isPending ||
    addClientMutation.isPending ||
    removeClientMutation.isPending;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 focus:outline-none flex flex-col max-h-[88vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <Dialog.Title className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <span>Project Collaborators</span>
                    {projectName && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-normal">
                        {projectName}
                      </span>
                    )}
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-slate-400 mt-0.5">
                    Manage squad members and external client stakeholders for
                    this workspace.
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage("")}
                  className="text-rose-400 hover:text-rose-200 text-xs"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Tabs */}
            <Tabs.Root
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <Tabs.List className="flex border-b border-slate-800 px-6 bg-slate-900/60 gap-4">
                <Tabs.Trigger
                  value="members"
                  className={`py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "members"
                      ? "border-cyan-400 text-cyan-300"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Internal Team Squad</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                    {projectMembers.length}
                  </span>
                </Tabs.Trigger>

                <Tabs.Trigger
                  value="clients"
                  className={`py-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "clients"
                      ? "border-cyan-400 text-cyan-300"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Client Stakeholders</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                    {projectClients.length}
                  </span>
                </Tabs.Trigger>
              </Tabs.List>

              {/* Tab 1: Internal Team Squad */}
              <Tabs.Content
                value="members"
                className="flex-1 overflow-y-auto p-6 space-y-6 focus:outline-none"
              >
                {/* Add Member Bar */}
                <form
                  onSubmit={handleAddMember}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center"
                >
                  <div className="flex-1">
                    <select
                      value={selectedInternalUserId}
                      onChange={(e) =>
                        setSelectedInternalUserId(e.target.value)
                      }
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="">
                        {availableAssignees.length === 0
                          ? "All registered engineers are already in this project"
                          : "-- Select engineer to enroll --"}
                      </option>
                      {availableAssignees.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.department} ({u.role.replace("_", " ")})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={!selectedInternalUserId || isSubmitting}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-cyan-500/20"
                  >
                    {addMemberMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                    <span>Enroll Member</span>
                  </button>
                </form>

                {/* Members List */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Enrolled Squad Members ({projectMembers.length})
                  </h4>

                  {isLoadingCollaborators ? (
                    <div className="py-8 flex items-center justify-center text-slate-500 text-xs gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Loading team members...</span>
                    </div>
                  ) : projectMembers.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800/80 text-slate-500 text-xs">
                      No internal team members currently assigned to this
                      project.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {projectMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700/80 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-slate-950 shadow-sm">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                                <span>{member.name}</span>
                                {member.id === currentUser?.id && (
                                  <span className="text-[10px] text-cyan-400 font-normal">
                                    (You)
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{member.email}</span>
                                <span>•</span>
                                <span className="text-cyan-400/90 font-medium">
                                  {member.department}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              {member.role === "INTERNAL_TEAM"
                                ? "Engineer"
                                : member.role.replace("_", " ")}
                            </span>

                            {confirmRemoveId === member.id ? (
                              <div className="flex items-center gap-1.5 animate-in fade-in">
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeMemberMutation.mutate(member.id)
                                  }
                                  disabled={isSubmitting}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-semibold transition-all cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRemoveId(null)}
                                  className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] hover:bg-slate-700 transition-all cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmRemoveId(member.id)}
                                title="Remove member from project"
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Tabs.Content>

              {/* Tab 2: Client Stakeholders */}
              <Tabs.Content
                value="clients"
                className="flex-1 overflow-y-auto p-6 space-y-6 focus:outline-none"
              >
                {/* Assign Client Bar */}
                <form
                  onSubmit={handleAddClient}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center"
                >
                  <div className="flex-1">
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="">
                        {availableClients.length === 0
                          ? "All registered client guests are already assigned"
                          : "-- Select client guest to assign --"}
                      </option>
                      {availableClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={!selectedClientId || isSubmitting}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-500/20"
                  >
                    {addClientMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                    <span>Assign Client</span>
                  </button>
                </form>

                {/* Clients List */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Assigned Client Guests ({projectClients.length})
                  </h4>

                  {isLoadingCollaborators ? (
                    <div className="py-8 flex items-center justify-center text-slate-500 text-xs gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Loading client guests...</span>
                    </div>
                  ) : projectClients.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800/80 text-slate-500 text-xs">
                      No client guests currently have viewing access to this
                      project.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {projectClients.map((client) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700/80 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-slate-950 shadow-sm">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-200">
                                {client.name}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {client.email}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                              Client Guest
                            </span>

                            {confirmRemoveId === client.id ? (
                              <div className="flex items-center gap-1.5 animate-in fade-in">
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeClientMutation.mutate(client.id)
                                  }
                                  disabled={isSubmitting}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-semibold transition-all cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRemoveId(null)}
                                  className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] hover:bg-slate-700 transition-all cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmRemoveId(client.id)}
                                title="Remove client access from project"
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Tabs.Content>
            </Tabs.Root>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Changes take effect immediately across all active sessions.
              </span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
