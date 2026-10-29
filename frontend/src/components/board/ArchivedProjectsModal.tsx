"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Archive, Calendar, Layers, RotateCcw, X } from "lucide-react";
import { useEffect } from "react";
import Swal from "sweetalert2";
import { apiClient } from "../../lib/api-client";
import { formatDate } from "../../lib/utils";
import type { ApiResponse, Project } from "../../types";

interface ArchivedProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRestoredProject: (projectId: string) => void;
}

export function ArchivedProjectsModal({
  isOpen,
  onClose,
  onSelectRestoredProject,
}: ArchivedProjectsModalProps) {
  const queryClient = useQueryClient();

  const { data: archivedData, isLoading } = useQuery<ApiResponse<Project[]>>({
    queryKey: ["archived-projects"],
    queryFn: async () => {
      const res = await apiClient.get("/api/projects/archived");
      return res.data;
    },
    enabled: isOpen,
  });

  const restoreMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await apiClient.post(`/api/projects/${projectId}/restore`);
      return res.data;
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["archived-projects"] });
      onSelectRestoredProject(projectId);
    },
  });

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const archivedProjects = archivedData?.data || [];

  const handleRestore = (project: Project) => {
    Swal.fire({
      title: "Restore Project Workspace?",
      html: `
        <div style="text-align: left; font-size: 0.875rem; color: #cbd5e1; line-height: 1.5;">
          <p>Are you sure you want to restore <b style="color: #38bdf8;">${project.name}</b>?</p>
          <div style="margin-top: 10px; padding: 10px 12px; background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.25); border-radius: 10px; color: #67e8f9; font-size: 0.75rem;">
            ✨ <b>Reactivation:</b> This workspace and all its associated deliverables will be restored to active status.
          </div>
        </div>
      `,
      icon: "question",
      iconColor: "#06b6d4",
      showCancelButton: true,
      confirmButtonColor: "#06b6d4",
      cancelButtonColor: "#334155",
      confirmButtonText: "Yes, restore workspace",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#f8fafc",
      customClass: {
        popup:
          "rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-md",
        confirmButton: "px-4 py-2 rounded-xl font-semibold shadow-md",
        cancelButton: "px-4 py-2 rounded-xl font-semibold",
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await restoreMutation.mutateAsync(project.id);
          Swal.fire({
            title: "Workspace Restored!",
            text: `Project "${project.name}" and its deliverables have been reactivated.`,
            icon: "success",
            iconColor: "#10b981",
            background: "#0f172a",
            color: "#f8fafc",
            confirmButtonColor: "#06b6d4",
            customClass: {
              popup: "rounded-2xl border border-slate-800 shadow-2xl",
              confirmButton: "px-4 py-2 rounded-xl font-semibold shadow-md",
            },
          });
        } catch (err: unknown) {
          const message =
            isAxiosError(err) && err.response?.data?.error?.message
              ? err.response.data.error.message
              : "Failed to restore project workspace.";
          Swal.fire({
            title: "Restore Failed",
            text: message,
            icon: "error",
            iconColor: "#f43f5e",
            background: "#0f172a",
            color: "#f8fafc",
            confirmButtonColor: "#06b6d4",
            customClass: {
              popup: "rounded-2xl border border-slate-800 shadow-2xl",
              confirmButton: "px-4 py-2 rounded-xl font-semibold shadow-md",
            },
          });
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Archived Project Workspaces</span>
                {archivedProjects.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                    {archivedProjects.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Review and restore soft-deleted workspaces and their
                deliverables.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-slate-800/40 border border-slate-800 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : archivedProjects.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-500 mb-3">
                <Archive className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">
                No Archived Workspaces
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                All project workspaces are currently active. When you delete a
                workspace, it will be safely archived here.
              </p>
            </div>
          ) : (
            archivedProjects.map((project) => (
              <div
                key={project.id}
                className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm sm:text-base text-slate-200 truncate">
                      {project.name}
                    </h4>
                  </div>
                  {project.description && (
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {project.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    {project.deleted_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Archived {formatDate(project.deleted_at)}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-cyan-400" />
                      <span>{project._count?.tasks ?? 0} deliverables</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestore(project)}
                    disabled={restoreMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/60 text-cyan-300 text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
