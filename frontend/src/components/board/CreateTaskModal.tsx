"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Calendar, Sparkles, UserCheck, X } from "lucide-react";
import { useEffect } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { apiClient } from "../../lib/api-client";
import { useTaskStore } from "../../store/useTaskStore";
import type { ApiResponse, CreateTaskPayload, User } from "../../types";

const createTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  department: z.enum(["PRODUCT", "UI_UX", "FRONTEND", "BACKEND", "MANAGEMENT"]),
  assignee_id: z.string().optional().nullable(),
  client_visible: z.boolean(),
  due_date: z.string().optional(),
});

type CreateTaskInput = z.infer<typeof createTaskSchema>;

interface CreateTaskModalProps {
  projectId: string;
  onCreateTask: (data: CreateTaskPayload) => Promise<void>;
}

export function CreateTaskModal({
  projectId,
  onCreateTask,
}: CreateTaskModalProps) {
  const { isCreateModalOpen, setIsCreateModalOpen } = useTaskStore();

  // Fetch active assignees dynamically from backend
  const { data: assigneesData, isLoading: isAssigneesLoading } = useQuery<
    ApiResponse<User[]>
  >({
    queryKey: ["assignees"],
    queryFn: async () => {
      const res = await apiClient.get("/api/users/assignees");
      return res.data;
    },
    enabled: isCreateModalOpen,
  });

  const assignees = assigneesData?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema) as Resolver<CreateTaskInput>,
    defaultValues: {
      department: "FRONTEND",
      assignee_id: "",
      client_visible: true,
    },
  });

  const selectedAssigneeId = watch("assignee_id");

  // Smart Sync: When an assignee is selected, auto-fill the department to match the assignee's department
  useEffect(() => {
    if (selectedAssigneeId && selectedAssigneeId !== "") {
      const matched = assignees.find((u) => u.id === selectedAssigneeId);
      if (
        matched &&
        ["PRODUCT", "UI_UX", "FRONTEND", "BACKEND", "MANAGEMENT"].includes(
          matched.department,
        )
      ) {
        setValue(
          "department",
          matched.department as CreateTaskInput["department"],
        );
      }
    }
  }, [selectedAssigneeId, assignees, setValue]);

  const onSubmit = async (data: CreateTaskInput) => {
    try {
      await onCreateTask({
        project_id: projectId,
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        department: data.department,
        assignee_id:
          data.assignee_id && data.assignee_id.trim() !== ""
            ? data.assignee_id
            : null,
        client_visible: data.client_visible,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      });
      reset();
      setIsCreateModalOpen(false);
    } catch (e) {
      console.error("Error creating task:", e);
    }
  };

  return (
    <Dialog.Root open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <Dialog.Content className="pointer-events-auto relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <Dialog.Title className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Create New Deliverable</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                    Dynamic Assignee
                  </span>
                </Dialog.Title>
                <Dialog.Description className="text-xs text-slate-400 mt-0.5">
                  Assign an operational task to a squad engineer with
                  state-based governance.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close dialog"
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Task Title */}
              <div>
                <label
                  htmlFor="task_title"
                  className="text-xs font-semibold text-slate-300 mb-1.5 block"
                >
                  Deliverable Title <span className="text-rose-400">*</span>
                </label>
                <input
                  id="task_title"
                  {...register("title")}
                  placeholder="e.g. Implement Webhook Handler, Design Checkout UI"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {errors.title && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="task_description"
                  className="text-xs font-semibold text-slate-300 mb-1.5 block"
                >
                  Scope & Acceptance Criteria
                </label>
                <textarea
                  id="task_description"
                  {...register("description")}
                  rows={3}
                  placeholder="Detail the technical specifications and expectations..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
                />
              </div>

              {/* Assignee & Department (Smart Sync) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dynamic Assignee Selector */}
                <div>
                  <label
                    htmlFor="task_assignee"
                    className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                      Assignee (Team Member)
                    </span>
                    {isAssigneesLoading && (
                      <span className="text-[10px] text-slate-500 animate-pulse">
                        Loading...
                      </span>
                    )}
                  </label>
                  <select
                    id="task_assignee"
                    {...register("assignee_id")}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="">Unassigned (Tugaskan Nanti)</option>
                    {assignees.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} — {user.department} (
                        {user.role === "INTERNAL_TEAM" ? "Engineer" : user.role}
                        )
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                    Memilih assignee otomatis mengisi departemen
                  </p>
                </div>

                {/* Department */}
                <div>
                  <label
                    htmlFor="task_department"
                    className="text-xs font-semibold text-slate-300 mb-1.5 block"
                  >
                    Department <span className="text-rose-400">*</span>
                  </label>
                  <select
                    id="task_department"
                    {...register("department")}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="FRONTEND">Frontend Engineering</option>
                    <option value="BACKEND">Backend Engineering</option>
                    <option value="UI_UX">UI/UX Design</option>
                    <option value="PRODUCT">Product Management</option>
                    <option value="MANAGEMENT">Management / Admin</option>
                  </select>
                </div>
              </div>

              {/* Due Date & Client Visibility */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label
                    htmlFor="task_due_date"
                    className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Due Date
                  </label>
                  <input
                    id="task_due_date"
                    type="date"
                    {...register("due_date")}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="sm:pt-5 flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="client_visible"
                    {...register("client_visible")}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-800 focus:ring-cyan-400 cursor-pointer"
                  />
                  <label
                    htmlFor="client_visible"
                    className="text-xs font-medium text-slate-300 cursor-pointer select-none"
                  >
                    Visible to Client Guest
                    <span className="block text-[10px] text-slate-500">
                      Tampil di portal klien dengan identitas disamarkan
                    </span>
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-md shadow-cyan-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Creating..." : "Create Deliverable"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
