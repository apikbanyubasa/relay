"use client";

import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { formatDateTime } from "../../lib/utils";
import type { StandupSummary } from "../../types";

interface StandupReportViewProps {
  data: StandupSummary;
}

export function StandupReportView({ data }: StandupReportViewProps) {
  const departments = Object.keys(data.summary || {});

  const getDeptName = (code: string) => {
    switch (code) {
      case "UI_UX":
        return "UI/UX Design";
      case "FRONTEND":
        return "Frontend Engineering";
      case "BACKEND":
        return "Backend Engineering";
      case "PRODUCT":
        return "Product Management";
      default:
        return code;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            Automated Audit Aggregation
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            Daily Standup Auto-Summary
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated intelligence parsed from 24-hour immutable audit trail
            logs and active dependency trees.
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-right shrink-0">
          <div className="text-[11px] text-slate-500">Report Date</div>
          <div className="text-sm font-bold text-cyan-400 font-mono">
            {data.date}
          </div>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map((deptKey) => {
          const dept = data.summary[deptKey];
          if (!dept) return null;

          return (
            <div
              key={deptKey}
              className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6"
            >
              {/* Dept Title */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-400" />
                  {getDeptName(deptKey)}
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-400 font-semibold">
                    {dept.completed_yesterday.length} Done
                  </span>
                  <span>•</span>
                  <span className="text-rose-400 font-semibold">
                    {dept.blocked_today.length} Blocked
                  </span>
                </div>
              </div>

              {/* What was completed yesterday */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Completed Yesterday
                </div>

                {dept.completed_yesterday.length > 0 ? (
                  <div className="space-y-2">
                    {dept.completed_yesterday.map((item) => (
                      <div
                        key={item.taskId}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200"
                      >
                        <div className="font-semibold text-slate-100">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                          <span>Completed by {item.completedBy}</span>
                          <span>{formatDateTime(item.completedAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-slate-950/30 border border-dashed border-slate-800/80">
                    No tasks moved to Done yesterday.
                  </p>
                )}
              </div>

              {/* What is blocked today */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800/60">
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Blocked Today
                </div>

                {dept.blocked_today.length > 0 ? (
                  <div className="space-y-2">
                    {dept.blocked_today.map((item) => (
                      <div
                        key={item.taskId}
                        className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 text-xs text-rose-200 space-y-1.5"
                      >
                        <div className="font-semibold text-rose-100">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-rose-300/80">
                          Assignee: {item.assignee || "Unassigned"}
                        </div>
                        <div className="text-[11px] text-rose-400/90 font-mono">
                          Blocked by: {item.blockedBy.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-slate-950/30 border border-dashed border-slate-800/80">
                    No deliverables currently blocked in this department.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
