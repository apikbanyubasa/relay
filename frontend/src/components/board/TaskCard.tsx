"use client";

import { AlertTriangle, ArrowRight, Clock, Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDate } from "../../lib/utils";
import { useAuthStore } from "../../store/useAuthStore";
import { useTaskStore } from "../../store/useTaskStore";
import type { Task, TaskStatus } from "../../types";

interface TaskCardProps {
  task: Task;
  onStatusChange: (
    taskId: string,
    newStatus: TaskStatus,
    currentVersion: number,
  ) => void;
}

export function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const { user } = useAuthStore();
  const { setSelectedTask } = useTaskStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset submitting state when task version or status changes from server
  useEffect(() => {
    if (task.version || task.status) {
      setIsSubmitting(false);
    }
  }, [task.version, task.status]);

  const getDepartmentStyle = (dept: string) => {
    switch (dept) {
      case "UI_UX":
        return "bg-pink-500/10 text-pink-400 border-pink-500/20";
      case "FRONTEND":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "BACKEND":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "PRODUCT":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  // Determine permissions for quick status transitions
  const isClient = user?.role === "CLIENT_GUEST";
  const isPM = user?.role === "PRODUCT_MANAGER" || user?.role === "SUPER_ADMIN";
  const isBlocked = task.isBlocked;

  const isAssignee = task.assignee_id === user?.id;

  // Next logical status in workflow
  const getNextStatus = (current: TaskStatus): TaskStatus | null => {
    if (current === "TODO") return "IN_PROGRESS";
    if (current === "IN_PROGRESS") return "IN_REVIEW";
    if (current === "IN_REVIEW") return "DONE";
    return null;
  };

  const nextStatus = getNextStatus(task.status);

  // Check if transition is legally allowed by State-Based & Dependency rules
  const canTransition = (): { allowed: boolean; reason?: string } => {
    if (isClient)
      return {
        allowed: false,
        reason: "Client Guests have read-only visibility",
      };
    if (!nextStatus)
      return { allowed: false, reason: "Task is already completed" };

    // Internal Team constraint: only the assigned engineer can update status (Bab 4.1)
    if (!isPM && !isAssignee) {
      return {
        allowed: false,
        reason: `Assigned to ${task.assignee?.name || "another engineer"}. Only the assigned engineer or PM can move this task.`,
      };
    }

    // Blocked tasks cannot move to IN_PROGRESS or DONE
    if (isBlocked && (nextStatus === "IN_PROGRESS" || nextStatus === "DONE")) {
      return {
        allowed: false,
        reason: `Blocked: Prerequisites not completed (${task.pendingDependencies?.map((d) => d.title).join(", ")})`,
      };
    }

    // Only the assigned executor can complete a task into DONE (Brief: 'only the executor can complete it')
    if (nextStatus === "DONE" && !isAssignee) {
      return {
        allowed: false,
        reason: isPM
          ? `PM cannot complete tasks assigned to other engineers (${task.assignee?.name || "executor"}). Only the assigned executor can move to DONE.`
          : `Only the assigned executor (${task.assignee?.name || "assignee"}) can move to DONE.`,
      };
    }

    return { allowed: true };
  };

  const transitionCheck = canTransition();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setSelectedTask(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSelectedTask(task);
        }
      }}
      className={`group relative bg-slate-900/70 border rounded-2xl p-4 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-cyan-500/5 cursor-pointer backdrop-blur-md overflow-hidden ${
        isBlocked
          ? "border-rose-900/60 hover:border-rose-700/80 bg-rose-950/10"
          : "border-slate-800 hover:border-cyan-500/40"
      }`}
    >
      {/* Top badges */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider border ${getDepartmentStyle(
              task.department,
            )}`}
          >
            {task.department}
          </span>

          <span
            title="Entity Version (Optimistic Locking)"
            className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-800"
          >
            v{task.version}
          </span>
        </div>

        {isBlocked && (
          <span
            title="BLOCKED: Dependencies must be finished first"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse shrink-0 ml-auto"
          >
            <Lock className="w-2.5 h-2.5" />
            Blocked
          </span>
        )}
      </div>

      {/* Task Title */}
      <h4 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Description Snippet */}
      {task.description && (
        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Blocked alert box if task is blocked */}
      {isBlocked &&
        task.pendingDependencies &&
        task.pendingDependencies.length > 0 && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 space-y-1">
            <div className="font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              Waiting on Prerequisites:
            </div>
            {task.pendingDependencies.map((dep) => (
              <div
                key={dep.id}
                className="text-[11px] text-rose-200/90 truncate"
              >
                • {dep.title} ({dep.status})
              </div>
            ))}
          </div>
        )}

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 gap-2">
        {/* Due date */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px]">{formatDate(task.due_date)}</span>
        </div>

        {/* Assignee / Masked identity */}
        <div className="flex items-center gap-2 min-w-0">
          {task.assignee ? (
            <div
              className="flex items-center gap-1.5 min-w-0"
              title={task.assignee.name}
            >
              {task.assignee.avatar_url ? (
                <img
                  src={task.assignee.avatar_url}
                  alt={task.assignee.name}
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-cyan-400 font-bold shrink-0">
                  {task.assignee.name.charAt(0)}
                </div>
              )}
              <span className="max-w-[100px] truncate text-[11px] text-slate-300">
                {task.assignee.name}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 italic">
              Unassigned
            </span>
          )}
        </div>
      </div>

      {/* Quick Action Button */}
      {nextStatus && !isClient && (
        <div className="mt-3 pt-2">
          <button
            type="button"
            disabled={!transitionCheck.allowed || isSubmitting}
            onClick={(e) => {
              e.stopPropagation();
              if (transitionCheck.allowed && nextStatus && !isSubmitting) {
                setIsSubmitting(true);
                onStatusChange(task.id, nextStatus, task.version);
              }
            }}
            title={transitionCheck.reason || `Move to ${nextStatus}`}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ${
              transitionCheck.allowed && !isSubmitting
                ? "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/30 cursor-pointer shadow-sm active:scale-95"
                : "bg-slate-800/40 text-slate-500 border border-slate-800/80 cursor-not-allowed opacity-60"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                {!transitionCheck.allowed && (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>
                  {!transitionCheck.allowed &&
                  nextStatus === "DONE" &&
                  !isAssignee
                    ? `Executor Only (${task.assignee?.name?.split(" ")[0] || "Assignee"})`
                    : `Move to ${nextStatus.replace("_", " ")}`}
                </span>
                {transitionCheck.allowed && (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
