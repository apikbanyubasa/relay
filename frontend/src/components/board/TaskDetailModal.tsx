"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FileText,
  GitFork,
  History,
  Lock,
  Paperclip,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { apiClient } from "../../lib/api-client";
import { formatDate, formatDateTime } from "../../lib/utils";
import { useAuthStore } from "../../store/useAuthStore";
import { useTaskStore } from "../../store/useTaskStore";
import type {
  ApiResponse,
  CreateAttachmentPayload,
  Task,
  TaskStatus,
  UpdateTaskPayload,
  User,
} from "../../types";

interface TaskDetailModalProps {
  onUpdateTask: (taskId: string, payload: UpdateTaskPayload) => Promise<void>;
  onAddDependency: (taskId: string, prerequisiteId: string) => Promise<void>;
  onRemoveDependency: (taskId: string, prerequisiteId: string) => Promise<void>;
  onAddAttachment: (
    taskId: string,
    attachment: CreateAttachmentPayload,
  ) => Promise<void>;
  availableTasks: Task[];
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

export function TaskDetailModal({
  onUpdateTask,
  onAddDependency,
  onRemoveDependency,
  onAddAttachment,
  availableTasks,
}: TaskDetailModalProps) {
  const { user } = useAuthStore();
  const { selectedTask, setSelectedTask } = useTaskStore();

  const [activeTab, setActiveTab] = useState<string>("details");
  const [selectedPrereqId, setSelectedPrereqId] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const taskId = selectedTask?.id;

  // Sync complete fresh task data when modal opens
  useEffect(() => {
    if (!taskId) return;
    let isCurrent = true;
    apiClient
      .get(`/api/tasks/${taskId}`)
      .then((res) => {
        if (isCurrent && res.data?.data) {
          setSelectedTask(res.data.data);
        }
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [taskId, setSelectedTask]);

  const isClient = user?.role === "CLIENT_GUEST";
  const isPM = user?.role === "PRODUCT_MANAGER" || user?.role === "SUPER_ADMIN";

  // Fetch active assignees dynamically for PM / Super Admin re-assignment
  const { data: assigneesData } = useQuery<ApiResponse<User[]>>({
    queryKey: ["assignees"],
    queryFn: async () => {
      const res = await apiClient.get("/api/users/assignees");
      return res.data;
    },
    enabled: !!selectedTask && isPM,
  });

  const assignees = assigneesData?.data || [];

  if (!selectedTask) return null;

  const isBlocked = selectedTask.isBlocked;

  // Filter tasks that could be added as dependencies (exclude itself and existing prereqs)
  const candidatePrereqs = availableTasks.filter(
    (t) =>
      t.id !== selectedTask.id &&
      !selectedTask.dependencies?.some((d) => d.prerequisite_id === t.id),
  );

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!selectedTask) return;
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await onUpdateTask(selectedTask.id, {
        assignee_id: newAssigneeId === "" ? null : newAssigneeId,
        version: selectedTask.version,
      });
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err, "Failed to update assignee"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDueDateChange = async (newDueDate: string) => {
    if (!selectedTask) return;
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await onUpdateTask(selectedTask.id, {
        due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
        version: selectedTask.version,
      });
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err, "Failed to update due date"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleClientVisibility = async () => {
    if (!selectedTask) return;
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await onUpdateTask(selectedTask.id, {
        client_visible: !selectedTask.client_visible,
        version: selectedTask.version,
      });
    } catch (err: unknown) {
      setErrorMessage(
        extractErrorMessage(err, "Failed to update client visibility"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await onUpdateTask(selectedTask.id, {
        status: newStatus,
        version: selectedTask.version,
      });
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err, "Failed to update status"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPrereq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrereqId) return;

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await onAddDependency(selectedTask.id, selectedPrereqId);
      setSelectedPrereqId("");
      const res = await apiClient.get(`/api/tasks/${selectedTask.id}`);
      if (res.data?.data) {
        setSelectedTask(res.data.data);
      }
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err, "Failed to add dependency"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePrereq = async (prereqId: string) => {
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await onRemoveDependency(selectedTask.id, prereqId);
      const res = await apiClient.get(`/api/tasks/${selectedTask.id}`);
      if (res.data?.data) {
        setSelectedTask(res.data.data);
      }
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err, "Failed to remove dependency"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAttachmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentName || !attachmentUrl) return;

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await onAddAttachment(selectedTask.id, {
        file_name: attachmentName,
        file_url: attachmentUrl,
        file_size: 1024 * 50, // 50KB mock size
      });
      setAttachmentName("");
      setAttachmentUrl("");
      const res = await apiClient.get(`/api/tasks/${selectedTask.id}`);
      if (res.data?.data) {
        setSelectedTask(res.data.data);
      }
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err, "Failed to add attachment"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root
      open={!!selectedTask}
      onOpenChange={(open) => !open && setSelectedTask(null)}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <Dialog.Content className="pointer-events-auto relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {selectedTask.department}
                  </span>
                  <span className="text-xs font-mono text-slate-500 px-2 py-0.5 bg-slate-800 rounded-md">
                    v{selectedTask.version}
                  </span>
                  {isBlocked && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <Lock className="w-3 h-3" />
                      Blocked
                    </span>
                  )}
                </div>
                <Dialog.Title className="text-xl font-bold text-slate-100">
                  {selectedTask.title}
                </Dialog.Title>
                <Dialog.Description className="sr-only">
                  Task details, status workflow, dependencies, attachments, and
                  audit log.
                </Dialog.Description>
              </div>

              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close modal"
                  className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Error message banner */}
            {errorMessage && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Radix UI Tabs */}
            <Tabs.Root
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <Tabs.List className="flex border-b border-slate-800 px-6 gap-6 bg-slate-950/20">
                <Tabs.Trigger
                  value="details"
                  className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                    activeTab === "details"
                      ? "border-cyan-400 text-cyan-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Overview
                </Tabs.Trigger>

                {!isClient && (
                  <Tabs.Trigger
                    value="dependencies"
                    className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                      activeTab === "dependencies"
                        ? "border-cyan-400 text-cyan-400"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <GitFork className="w-4 h-4" />
                    Dependencies
                    {selectedTask.dependencies &&
                      selectedTask.dependencies.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[11px] text-slate-300">
                          {selectedTask.dependencies.length}
                        </span>
                      )}
                  </Tabs.Trigger>
                )}

                {!isClient && (
                  <Tabs.Trigger
                    value="attachments"
                    className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                      activeTab === "attachments"
                        ? "border-cyan-400 text-cyan-400"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Paperclip className="w-4 h-4" />
                    Attachments
                    {selectedTask.attachments &&
                      selectedTask.attachments.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[11px] text-slate-300">
                          {selectedTask.attachments.length}
                        </span>
                      )}
                  </Tabs.Trigger>
                )}

                {!isClient && (
                  <Tabs.Trigger
                    value="audit"
                    className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                      activeTab === "audit"
                        ? "border-cyan-400 text-cyan-400"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <History className="w-4 h-4" />
                    Audit Trail
                    {selectedTask.audit_logs &&
                      selectedTask.audit_logs.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[11px] text-slate-300">
                          {selectedTask.audit_logs.length}
                        </span>
                      )}
                  </Tabs.Trigger>
                )}
              </Tabs.List>

              {/* Tab Contents */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <Tabs.Content
                  value="details"
                  className="space-y-6 focus:outline-none"
                >
                  {/* Description */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
                      Description
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedTask.description || "No description provided."}
                    </div>
                  </div>

                  {/* Status Transition Control */}
                  {!isClient && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                        <span>Move Status (Workflow State Machine)</span>
                        {!isPM && selectedTask.assignee_id !== user?.id && (
                          <span className="text-[11px] text-amber-400 normal-case font-normal">
                            Read-Only (Assigned to{" "}
                            {selectedTask.assignee?.name || "another engineer"})
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(
                          [
                            "TODO",
                            "IN_PROGRESS",
                            "IN_REVIEW",
                            "DONE",
                          ] as TaskStatus[]
                        ).map((st) => {
                          const isCurrent = selectedTask.status === st;
                          const isAssignee =
                            selectedTask.assignee_id === user?.id;
                          const isNotOwnerAndNotPM = !isPM && !isAssignee;
                          const isNonPMReopening =
                            !isPM &&
                            selectedTask.status === "DONE" &&
                            st === "IN_PROGRESS";
                          const isPMTryingDone =
                            isPM && st === "DONE" && !isAssignee;
                          const isBlockedTryingWork =
                            isBlocked &&
                            (st === "IN_PROGRESS" || st === "DONE");
                          const isDisabled =
                            isCurrent ||
                            isNotOwnerAndNotPM ||
                            isNonPMReopening ||
                            isPMTryingDone ||
                            isBlockedTryingWork ||
                            isSubmitting;

                          return (
                            <button
                              key={st}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => handleStatusChange(st)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                isCurrent
                                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                                  : isDisabled
                                    ? "bg-slate-950/30 text-slate-600 border-slate-900 cursor-not-allowed opacity-50"
                                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                              }`}
                            >
                              {st.replace("_", " ")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
                    {/* Assignee Card */}
                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col justify-between">
                      <div className="text-xs text-slate-500 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          Assignee
                        </span>
                        {isPM && (
                          <span className="text-[10px] text-cyan-400 font-medium bg-cyan-500/10 px-1.5 py-0.5 rounded">
                            Editable
                          </span>
                        )}
                      </div>
                      {isPM ? (
                        <select
                          disabled={isSubmitting}
                          value={selectedTask.assignee_id || ""}
                          onChange={(e) => handleAssigneeChange(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="">Unassigned</option>
                          {assignees.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.department})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm font-semibold text-slate-200">
                          {selectedTask.assignee?.name || "Unassigned"}
                        </div>
                      )}
                    </div>

                    {/* Due Date Card */}
                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col justify-between">
                      <div className="text-xs text-slate-500 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Due Date
                        </span>
                        {isPM && (
                          <span className="text-[10px] text-cyan-400 font-medium bg-cyan-500/10 px-1.5 py-0.5 rounded">
                            Editable
                          </span>
                        )}
                      </div>
                      {isPM ? (
                        <input
                          type="date"
                          disabled={isSubmitting}
                          value={
                            selectedTask.due_date
                              ? new Date(selectedTask.due_date)
                                  .toISOString()
                                  .split("T")[0]
                              : ""
                          }
                          onChange={(e) => handleDueDateChange(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer disabled:opacity-50"
                        />
                      ) : (
                        <div className="text-sm font-semibold text-slate-200">
                          {formatDate(selectedTask.due_date)}
                        </div>
                      )}
                    </div>

                    {/* Client Visible Card */}
                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col justify-between">
                      <div className="text-xs text-slate-500 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          {selectedTask.client_visible ? (
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          Client Visibility
                        </span>
                        {isPM && (
                          <span className="text-[10px] text-cyan-400 font-medium bg-cyan-500/10 px-1.5 py-0.5 rounded">
                            Toggleable
                          </span>
                        )}
                      </div>
                      {isPM ? (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleToggleClientVisibility}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer disabled:opacity-50 ${
                            selectedTask.client_visible
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                          }`}
                        >
                          <span>
                            {selectedTask.client_visible
                              ? "Public to Client"
                              : "Internal Only"}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              selectedTask.client_visible
                                ? "bg-emerald-400 animate-pulse"
                                : "bg-slate-500"
                            }`}
                          />
                        </button>
                      ) : (
                        <div className="text-sm font-semibold text-slate-200">
                          {selectedTask.client_visible ? (
                            <span className="text-emerald-400">
                              Yes (Public to Client)
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Internal Only
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Tabs.Content>

                {!isClient && (
                  <Tabs.Content
                    value="dependencies"
                    className="space-y-6 focus:outline-none"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200 mb-3">
                        Prerequisites Required for this Task (DAG)
                      </h4>
                      {selectedTask.dependencies &&
                      selectedTask.dependencies.length > 0 ? (
                        <div className="space-y-2">
                          {selectedTask.dependencies.map((dep) => (
                            <div
                              key={dep.id}
                              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800"
                            >
                              <div className="flex items-center gap-3">
                                {dep.prerequisite.status === "DONE" ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                ) : (
                                  <Clock className="w-5 h-5 text-amber-400" />
                                )}
                                <div>
                                  <div className="text-sm font-medium text-slate-200">
                                    {dep.prerequisite.title}
                                  </div>
                                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span>{dep.prerequisite.department}</span>
                                    <span>•</span>
                                    <span
                                      className={
                                        dep.prerequisite.status === "DONE"
                                          ? "text-emerald-400"
                                          : "text-amber-400"
                                      }
                                    >
                                      {dep.prerequisite.status}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {isPM && (
                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() =>
                                    handleRemovePrereq(dep.prerequisite_id)
                                  }
                                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Remove dependency"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic p-4 border border-dashed border-slate-800 rounded-xl">
                          This task has no prerequisites. It can be started
                          immediately.
                        </p>
                      )}
                    </div>

                    {isPM && (
                      <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                          Define New Prerequisite (PM Permission)
                        </h4>
                        <p className="text-xs text-slate-400">
                          Adding a prerequisite will lock this task in Blocked
                          state until the prerequisite is completed.
                        </p>
                        <form onSubmit={handleAddPrereq} className="flex gap-2">
                          <select
                            value={selectedPrereqId}
                            onChange={(e) =>
                              setSelectedPrereqId(e.target.value)
                            }
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                          >
                            <option value="">
                              Select a prerequisite task...
                            </option>
                            {candidatePrereqs.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.title} ({t.department} - {t.status})
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            disabled={!selectedPrereqId || isSubmitting}
                            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer"
                          >
                            Add Prerequisite
                          </button>
                        </form>
                      </div>
                    )}
                  </Tabs.Content>
                )}

                {!isClient && (
                  <Tabs.Content
                    value="attachments"
                    className="space-y-6 focus:outline-none"
                  >
                    <div className="space-y-2">
                      {selectedTask.attachments &&
                      selectedTask.attachments.length > 0 ? (
                        selectedTask.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800"
                          >
                            <div className="flex items-center gap-3">
                              <Paperclip className="w-5 h-5 text-cyan-400" />
                              <div>
                                <a
                                  href={att.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-cyan-300 hover:underline"
                                >
                                  {att.file_name}
                                </a>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  Uploaded by {att.uploaded_by} •{" "}
                                  {formatDate(att.created_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic p-4 border border-dashed border-slate-800 rounded-xl">
                          No attachments uploaded yet.
                        </p>
                      )}
                    </div>

                    <form
                      onSubmit={handleAddAttachmentSubmit}
                      className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3"
                    >
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                        Upload Work Attachment
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="File Name (e.g. Slicing-PR.zip, Figma-Link)"
                          value={attachmentName}
                          onChange={(e) => setAttachmentName(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                        />
                        <input
                          type="url"
                          placeholder="File URL (https://...)"
                          value={attachmentUrl}
                          onChange={(e) => setAttachmentUrl(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={
                          !attachmentName || !attachmentUrl || isSubmitting
                        }
                        className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        Save Attachment
                      </button>
                    </form>
                  </Tabs.Content>
                )}

                {!isClient && (
                  <Tabs.Content
                    value="audit"
                    className="space-y-3 focus:outline-none"
                  >
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Immutable Change Log History (Audit Trail)
                    </h4>
                    {selectedTask.audit_logs &&
                    selectedTask.audit_logs.length > 0 ? (
                      <div className="relative border-l border-slate-800 ml-3 space-y-4 py-2">
                        {selectedTask.audit_logs.map((log) => (
                          <div key={log.id} className="relative pl-6">
                            <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-cyan-500 ring-4 ring-slate-900" />
                            <div className="text-xs text-slate-300">
                              <span className="font-semibold text-slate-100">
                                {log.user?.name || "System User"}
                              </span>{" "}
                              changed{" "}
                              <code className="text-cyan-400">
                                {log.changed_column}
                              </code>{" "}
                              from{" "}
                              <span className="line-through text-slate-500">
                                {log.old_value || "none"}
                              </span>{" "}
                              to{" "}
                              <span className="font-semibold text-emerald-400">
                                {log.new_value}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {formatDateTime(log.created_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic p-4 border border-dashed border-slate-800 rounded-xl">
                        No mutations logged for this task.
                      </p>
                    )}
                  </Tabs.Content>
                )}
              </div>
            </Tabs.Root>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
