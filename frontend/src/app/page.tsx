"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  AlertCircle,
  Archive,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  Table,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { ArchivedProjectsModal } from "../components/board/ArchivedProjectsModal";
import { CreateProjectModal } from "../components/board/CreateProjectModal";
import { CreateTaskModal } from "../components/board/CreateTaskModal";
import { DeliverablesTableView } from "../components/board/DeliverablesTableView";
import { KanbanColumn } from "../components/board/KanbanColumn";
import { ProjectMembersModal } from "../components/board/ProjectMembersModal";
import { TaskDetailModal } from "../components/board/TaskDetailModal";
import { ClientMetricsView } from "../components/client/ClientMetricsView";
import { ConflictModal } from "../components/ui/ConflictModal";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { KanbanLoadingSkeleton } from "../components/ui/LoadingState";
import { Navbar } from "../components/ui/Navbar";
import { apiClient } from "../lib/api-client";
import { useAuthStore } from "../store/useAuthStore";
import { useTaskStore } from "../store/useTaskStore";
import type {
  ApiResponse,
  ClientProjectView,
  CreateAttachmentPayload,
  CreateProjectPayload,
  CreateTaskPayload,
  Project,
  Task,
  TaskStatus,
  UpdateTaskPayload,
} from "../types";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, initialize } = useAuthStore();
  const {
    searchTerm,
    setSearchTerm,
    departmentFilter,
    setDepartmentFilter,
    onlyMyTasks,
    setOnlyMyTasks,
    selectedTask,
    setSelectedTask,
    setIsCreateModalOpen,
    openConflictModal,
  } = useTaskStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] =
    useState(false);
  const [isProjectMembersModalOpen, setIsProjectMembersModalOpen] =
    useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<"board" | "table">("board");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Close workspace menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        workspaceMenuRef.current &&
        !workspaceMenuRef.current.contains(event.target as Node)
      ) {
        setIsWorkspaceMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Initialize auth
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auth redirection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Search debounce (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Projects List
  const { data: projectsData } = useQuery<ApiResponse<Project[]>>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await apiClient.get("/api/projects");
      return res.data;
    },
    enabled: !!user,
  });

  const projects = projectsData?.data || [];

  // Fetch Archived Projects Count (PM only)
  const { data: archivedProjectsData } = useQuery<ApiResponse<Project[]>>({
    queryKey: ["archived-projects"],
    queryFn: async () => {
      const res = await apiClient.get("/api/projects/archived");
      return res.data;
    },
    enabled:
      !!user &&
      (user.role === "PRODUCT_MANAGER" || user.role === "SUPER_ADMIN"),
  });

  const archivedCount = archivedProjectsData?.data?.length || 0;

  // Automatically select first project
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0]?.id);
    }
  }, [projects, selectedProjectId]);

  // For Client Guest: Fetch Client Portal View
  const {
    data: clientViewData,
    isLoading: clientViewLoading,
    isError: clientViewError,
    refetch: refetchClientView,
  } = useQuery<ApiResponse<ClientProjectView>>({
    queryKey: ["client-view", selectedProjectId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/projects/${selectedProjectId}/client-view`,
      );
      return res.data;
    },
    enabled: !!user && user.role === "CLIENT_GUEST" && !!selectedProjectId,
  });

  // For Internal & PM: Fetch Board Tasks
  const {
    data: boardData,
    isLoading: boardLoading,
    isError: boardError,
    refetch: refetchBoard,
  } = useQuery<
    ApiResponse<{ project: Project; columns: Record<TaskStatus, Task[]> }>
  >({
    queryKey: ["project-board", selectedProjectId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/projects/${selectedProjectId}/board`,
      );
      return res.data;
    },
    enabled: !!user && user.role !== "CLIENT_GUEST" && !!selectedProjectId,
  });

  // Mutation: Update Task Status with Optimistic Concurrency Handling
  const updateTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      payload,
    }: {
      taskId: string;
      payload: UpdateTaskPayload;
    }) => {
      const res = await apiClient.patch(`/api/tasks/${taskId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({
        queryKey: ["project-board", selectedProjectId],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: unknown) => {
      if (isAxiosError<ApiResponse<unknown>>(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data?.error;

        // HTTP 409 Conflict: Trigger Optimistic Locking Modal
        if (status === 409) {
          openConflictModal(
            errorData?.message || "Conflict detected",
            selectedTask?.title || "Deliverable",
            () => {
              queryClient.invalidateQueries({
                queryKey: ["project-board", selectedProjectId],
              });
              setSelectedTask(null);
            },
          );
          return;
        }

        // HTTP 422 Blocked / HTTP 403 Forbidden
        setActionError(
          errorData?.message || error.message || "Operation failed",
        );
        return;
      }

      if (error instanceof Error) {
        setActionError(error.message);
      } else {
        setActionError("Operation failed");
      }
    },
  });

  // Mutation: Add Dependency (PM only)
  const addDependencyMutation = useMutation({
    mutationFn: async ({
      taskId,
      prerequisiteId,
    }: {
      taskId: string;
      prerequisiteId: string;
    }) => {
      const res = await apiClient.post(`/api/tasks/${taskId}/dependencies`, {
        prerequisite_id: prerequisiteId,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-board", selectedProjectId],
      });
    },
  });

  // Mutation: Remove Dependency (PM only)
  const removeDependencyMutation = useMutation({
    mutationFn: async ({
      taskId,
      prerequisiteId,
    }: {
      taskId: string;
      prerequisiteId: string;
    }) => {
      const res = await apiClient.delete(
        `/api/tasks/${taskId}/dependencies/${prerequisiteId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-board", selectedProjectId],
      });
    },
  });

  // Mutation: Add Attachment
  const addAttachmentMutation = useMutation({
    mutationFn: async ({
      taskId,
      attachment,
    }: {
      taskId: string;
      attachment: CreateAttachmentPayload;
    }) => {
      const res = await apiClient.post(
        `/api/tasks/${taskId}/attachments`,
        attachment,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-board", selectedProjectId],
      });
    },
  });

  // Mutation: Create Task (PM only)
  const createTaskMutation = useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      const res = await apiClient.post("/api/tasks", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-board", selectedProjectId],
      });
    },
  });

  // Mutation: Create Project (PM only)
  const createProjectMutation = useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const res = await apiClient.post("/api/projects", payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (data?.data?.id) {
        setSelectedProjectId(data.data.id);
      }
    },
  });

  // Mutation: Delete Project (PM only)
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await apiClient.delete(`/api/projects/${projectId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["archived-projects"] });
    },
  });

  // Handle Project Deletion with SweetAlert2 Confirmation (PM only)
  const handleDeleteProject = () => {
    if (!selectedProjectId) return;
    const currentProject = projects.find((p) => p.id === selectedProjectId);
    const projectName = currentProject?.name || "this project";

    Swal.fire({
      title: "Delete Project Workspace?",
      html: `
        <div style="text-align: left; font-size: 0.875rem; color: #cbd5e1; line-height: 1.5;">
          <p>Are you sure you want to delete <b style="color: #fb7185;">${projectName}</b>?</p>
          <div style="margin-top: 10px; padding: 10px 12px; background: rgba(225, 29, 72, 0.1); border: 1px solid rgba(225, 29, 72, 0.25); border-radius: 10px; color: #fda4af; font-size: 0.75rem;">
            ⚠️ <b>Permanent Action:</b> This workspace and all associated deliverables will be archived.
          </div>
        </div>
      `,
      icon: "warning",
      iconColor: "#f43f5e",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#334155",
      confirmButtonText: "Yes, delete workspace",
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
          await deleteProjectMutation.mutateAsync(selectedProjectId);
          const remaining = projects.filter((p) => p.id !== selectedProjectId);
          setSelectedProjectId(remaining[0]?.id || "");
          Swal.fire({
            title: "Workspace Deleted",
            text: `Project "${projectName}" has been successfully deleted.`,
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
              : "Failed to delete project workspace.";
          Swal.fire({
            title: "Delete Failed",
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

  // Filter tasks based on search, department, and personal assignment (My Tasks)
  const filteredColumns = useMemo(() => {
    if (!boardData?.data?.columns) {
      return { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
    }

    const cols = boardData.data.columns;
    const filterFn = (t: Task) => {
      const matchesSearch =
        debouncedSearch === "" ||
        t.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.description?.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesDept =
        departmentFilter === "ALL" || t.department === departmentFilter;

      const matchesAssignee = !onlyMyTasks || t.assignee_id === user?.id;

      return matchesSearch && matchesDept && matchesAssignee;
    };

    return {
      TODO: cols.TODO?.filter(filterFn) || [],
      IN_PROGRESS: cols.IN_PROGRESS?.filter(filterFn) || [],
      IN_REVIEW: cols.IN_REVIEW?.filter(filterFn) || [],
      DONE: cols.DONE?.filter(filterFn) || [],
    };
  }, [boardData, debouncedSearch, departmentFilter, onlyMyTasks, user]);

  const allAvailableTasks = useMemo(() => {
    if (!boardData?.data?.columns) return [];
    const cols = boardData.data.columns;
    return [
      ...(cols.TODO || []),
      ...(cols.IN_PROGRESS || []),
      ...(cols.IN_REVIEW || []),
      ...(cols.DONE || []),
    ];
  }, [boardData]);

  const myTasksCount = useMemo(() => {
    if (!user || !boardData?.data?.columns) return 0;
    return allAvailableTasks.filter((t) => t.assignee_id === user.id).length;
  }, [allAvailableTasks, user, boardData]);

  if (authLoading || (!user && typeof window !== "undefined")) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  const isClient = user?.role === "CLIENT_GUEST";
  const isPM = user?.role === "PRODUCT_MANAGER" || user?.role === "SUPER_ADMIN";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Project Selector & Actions Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 hover:border-slate-600 font-bold text-sm sm:text-base text-slate-100 rounded-xl px-3.5 py-2 focus:outline-none focus:border-cyan-400 cursor-pointer shadow-sm transition-all"
              >
                {projects.length === 0 && (
                  <option value="">No projects found</option>
                )}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {isPM && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCreateProjectModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-500/40 hover:bg-slate-800 text-cyan-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    title="Create new project workspace (PM only)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Project</span>
                  </button>

                  {selectedProjectId && (
                    <button
                      type="button"
                      onClick={() => setIsProjectMembersModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-500/40 hover:bg-slate-800 text-cyan-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                      title="Manage project team members and client stakeholders"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Collaborators</span>
                    </button>
                  )}

                  {/* Kebab / More Options Menu (Archived & Delete) */}
                  <div className="relative" ref={workspaceMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsWorkspaceMenuOpen((prev) => !prev)}
                      className={`p-2 rounded-xl bg-slate-900 border transition-all cursor-pointer shadow-sm relative ${
                        isWorkspaceMenuOpen
                          ? "border-cyan-500/50 bg-slate-800 text-cyan-300"
                          : "border-slate-700/80 hover:border-slate-600 text-slate-400 hover:text-slate-200"
                      }`}
                      title="Workspace options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                      {archivedCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-slate-950" />
                      )}
                    </button>

                    {isWorkspaceMenuOpen && (
                      <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl z-40 p-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                        {selectedProjectId && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsWorkspaceMenuOpen(false);
                              setIsProjectMembersModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 transition-all cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Manage Collaborators</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsWorkspaceMenuOpen(false);
                            setIsArchiveModalOpen(true);
                          }}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Archive className="w-3.5 h-3.5 text-amber-400" />
                            <span>Archived Projects</span>
                          </div>
                          {archivedCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                              {archivedCount}
                            </span>
                          )}
                        </button>

                        {selectedProjectId && (
                          <>
                            <div className="my-1 border-t border-slate-800/80" />
                            <button
                              type="button"
                              onClick={() => {
                                setIsWorkspaceMenuOpen(false);
                                handleDeleteProject();
                              }}
                              disabled={deleteProjectMutation.isPending}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Workspace</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons & View Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {!isClient && (
              <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-inner">
                <button
                  type="button"
                  onClick={() => setActiveView("board")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeView === "board"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Kanban Board</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeView === "table"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Deliverables Table</span>
                </button>
              </div>
            )}

            {isPM && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Deliverable
              </button>
            )}
          </div>
        </div>

        {/* Global Action Error Banner */}
        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-900/80 text-rose-300 text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-xs text-rose-400 hover:underline font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* CLIENT GUEST VIEW */}
        {isClient ? (
          !selectedProjectId ? (
            <EmptyState
              title="No active project workspace"
              description="No projects have been provisioned for client view."
            />
          ) : clientViewLoading ? (
            <div className="space-y-6">
              <div className="h-48 bg-slate-900/60 rounded-3xl animate-pulse" />
              <div className="h-32 bg-slate-900/60 rounded-3xl animate-pulse" />
            </div>
          ) : clientViewError ? (
            <ErrorState
              title="Failed to load client portal"
              message="Unable to reach the client isolation endpoint."
              onRetry={() => refetchClientView()}
            />
          ) : clientViewData?.data ? (
            <ClientMetricsView data={clientViewData.data} />
          ) : (
            <EmptyState title="No project data available" />
          )
        ) : !selectedProjectId ? (
          <EmptyState
            title="No active project workspace"
            description={
              isPM
                ? "Create a new project workspace using the '+ New Project' button above."
                : "No project workspaces are currently available."
            }
          />
        ) : activeView === "table" ? (
          /* DELIVERABLES SERVER QUERY TABLE VIEW */
          <DeliverablesTableView projectId={selectedProjectId} />
        ) : (
          /* INTERNAL TEAM & PM KANBAN BOARD VIEW */
          <div className="space-y-6">
            {/* Search and Filters Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search deliverables (contains / searchFilters)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Department Filter Tabs & My Tasks Button */}
              <div className="flex flex-wrap items-center gap-2">
                {/* My Tasks Personal Filter */}
                <button
                  type="button"
                  onClick={() => setOnlyMyTasks(!onlyMyTasks)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shadow-sm ${
                    onlyMyTasks
                      ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-bold border border-cyan-400 shadow-cyan-500/20"
                      : "bg-slate-900/60 text-slate-300 hover:text-slate-100 hover:bg-slate-800 border border-slate-800"
                  }`}
                  title="Filter deliverables assigned to me"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>My Tasks</span>
                  {myTasksCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        onlyMyTasks
                          ? "bg-slate-950/25 text-slate-950"
                          : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      }`}
                    >
                      {myTasksCount}
                    </span>
                  )}
                </button>

                <div className="h-4 w-px bg-slate-800 hidden sm:block" />

                {/* Department Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {(
                    ["ALL", "UI_UX", "FRONTEND", "BACKEND", "PRODUCT"] as const
                  ).map((dept) => (
                    <button
                      type="button"
                      key={dept}
                      onClick={() => setDepartmentFilter(dept)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        departmentFilter === dept
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      {dept === "ALL" ? "All Disciplines" : dept}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Kanban Columns */}
            {boardLoading ? (
              <KanbanLoadingSkeleton />
            ) : boardError ? (
              <ErrorState
                title="Failed to load deliverables board"
                message="Unable to load tasks for this project. Please verify that the backend engine is running."
                onRetry={() => refetchBoard()}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(
                  ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as TaskStatus[]
                ).map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    tasks={filteredColumns[status]}
                    onStatusChange={(taskId, newStatus, currentVersion) => {
                      updateTaskMutation.mutate({
                        taskId,
                        payload: { status: newStatus, version: currentVersion },
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <TaskDetailModal
        availableTasks={allAvailableTasks}
        onUpdateTask={async (taskId, payload) => {
          const res = await updateTaskMutation.mutateAsync({ taskId, payload });
          if (res?.data) {
            setSelectedTask(res.data);
          }
        }}
        onAddDependency={async (taskId, prereqId) => {
          await addDependencyMutation.mutateAsync({
            taskId,
            prerequisiteId: prereqId,
          });
        }}
        onRemoveDependency={async (taskId, prereqId) => {
          await removeDependencyMutation.mutateAsync({
            taskId,
            prerequisiteId: prereqId,
          });
        }}
        onAddAttachment={async (taskId, attachment) => {
          await addAttachmentMutation.mutateAsync({ taskId, attachment });
        }}
      />

      {isPM && selectedProjectId && (
        <CreateTaskModal
          projectId={selectedProjectId}
          onCreateTask={async (payload) => {
            await createTaskMutation.mutateAsync(payload);
          }}
        />
      )}

      {isPM && (
        <CreateProjectModal
          isOpen={isCreateProjectModalOpen}
          onOpenChange={setIsCreateProjectModalOpen}
          onCreateProject={async (payload) => {
            await createProjectMutation.mutateAsync(payload);
          }}
        />
      )}

      {isPM && selectedProjectId && (
        <ProjectMembersModal
          projectId={selectedProjectId}
          projectName={projects.find((p) => p.id === selectedProjectId)?.name}
          isOpen={isProjectMembersModalOpen}
          onOpenChange={setIsProjectMembersModalOpen}
        />
      )}

      {isPM && (
        <ArchivedProjectsModal
          isOpen={isArchiveModalOpen}
          onClose={() => setIsArchiveModalOpen(false)}
          onSelectRestoredProject={(projectId) => {
            setSelectedProjectId(projectId);
            setIsArchiveModalOpen(false);
          }}
        />
      )}

      <ConflictModal />
    </div>
  );
}
