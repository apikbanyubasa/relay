"use client";

import {
  Briefcase,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { formatDate } from "../../lib/utils";
import type { ClientProjectView } from "../../types";

interface ClientMetricsViewProps {
  data: ClientProjectView;
}

export function ClientMetricsView({ data }: ClientMetricsViewProps) {
  const { project, metrics, tasks } = data;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Banner Notice */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            <strong>Multi-Tenant Client Guest Portal:</strong> Real-time
            visibility into project progress. Internal identities and
            engineering discussions are strictly scrubbed by backend data
            masking.
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 font-semibold text-[11px] whitespace-nowrap">
          Isolated Environment
        </span>
      </div>

      {/* Project Overview Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div>
            <div className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-1">
              Active Client Engagement
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
              {project.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              {project.description}
            </p>
          </div>

          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-8">
            <div className="text-xs text-slate-400">Total Completion</div>
            <div className="text-4xl font-extrabold text-cyan-400 font-mono tracking-tight mt-1">
              {metrics.progressPercentage}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {metrics.completedTasks} of {metrics.totalTasks} deliverables done
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-500 shadow-lg shadow-cyan-500/30"
              style={{ width: `${metrics.progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>Stage 1: Inception</span>
            <span>Stage 2: Active Delivery</span>
            <span>Stage 3: Handoff Ready</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Total Deliverables</div>
              <div className="text-lg font-bold text-slate-200">
                {metrics.totalTasks}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">In Progress</div>
              <div className="text-lg font-bold text-slate-200">
                {metrics.inProgressTasks}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Completed & Verified</div>
              <div className="text-lg font-bold text-slate-200">
                {metrics.completedTasks}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deliverables List (Masked Data) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-cyan-400" />
          Deliverables Backlog & Status
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-100">
                    {task.title}
                  </h4>
                  {task.isBlocked && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Prerequisites Pending
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="text-xs text-slate-400 max-w-xl line-clamp-1">
                    {task.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">Target Date</div>
                  <div className="font-medium text-slate-300">
                    {formatDate(task.due_date)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-slate-500">Resource</div>
                  <div className="font-medium text-slate-300">
                    {task.assignee?.name || "Assigned Engineer"}
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-xl text-xs font-semibold uppercase tracking-wider border ${
                    task.status === "DONE"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : task.status === "IN_PROGRESS"
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {task.status.replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
