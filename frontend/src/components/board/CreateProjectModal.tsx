"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, FolderPlus, UserCheck, X } from "lucide-react";
import { type Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { apiClient } from "../../lib/api-client";
import type { ApiResponse, CreateProjectPayload, User } from "../../types";

const createProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().optional(),
  client_id: z.string().optional().nullable(),
});

type CreateProjectInput = z.infer<typeof createProjectSchema>;

interface CreateProjectModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (data: CreateProjectPayload) => Promise<void>;
}

export function CreateProjectModal({
  isOpen,
  onOpenChange,
  onCreateProject,
}: CreateProjectModalProps) {
  // Fetch registered active client guests
  const { data: clientsData } = useQuery<ApiResponse<User[]>>({
    queryKey: ["client-guests"],
    queryFn: async () => {
      const res = await apiClient.get("/api/users/clients");
      return res.data;
    },
    enabled: isOpen,
  });

  const clients = clientsData?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema) as Resolver<CreateProjectInput>,
    defaultValues: {
      name: "",
      description: "",
      client_id: "",
    },
  });

  const onSubmit = async (data: CreateProjectInput) => {
    try {
      await onCreateProject({
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        client_id:
          data.client_id && data.client_id.trim() !== ""
            ? data.client_id
            : null,
      });
      reset();
      onOpenChange(false);
    } catch (e) {
      console.error("Error creating project:", e);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 focus:outline-none">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <Dialog.Title className="text-lg font-bold text-slate-100">
                    Create New Project Workspace
                  </Dialog.Title>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Define an enterprise workspace for squad deliverables
                  </p>
                </div>
              </div>
              <Dialog.Close className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label
                  htmlFor="project_name"
                  className="text-xs font-semibold text-slate-300 mb-1.5 block"
                >
                  Project Workspace Name{" "}
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  id="project_name"
                  {...register("name")}
                  placeholder="e.g. Mobile Banking SuperApp, AI Engine"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {errors.name && (
                  <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="project_desc"
                  className="text-xs font-semibold text-slate-300 mb-1.5 block"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="project_desc"
                  {...register("description")}
                  rows={3}
                  placeholder="Summarize the core objectives and squad scope for this project..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
                />
              </div>

              <div>
                <label
                  htmlFor="project_client"
                  className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                    Assign Client Guest (Optional)
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    External Client Access
                  </span>
                </label>
                <select
                  id="project_client"
                  {...register("client_id")}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer"
                >
                  <option value="">None (Internal Project Only)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.email}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Assigning a client allows them to monitor deliverables marked
                  &quot;Public to Client&quot;.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80 mt-6">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
