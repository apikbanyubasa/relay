"use client";

import { CheckCircle2, Circle, Clock, Eye, Inbox } from "lucide-react";
import type { Task, TaskStatus } from "../../types";
import { TaskCard } from "./TaskCard";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onStatusChange: (
    taskId: string,
    newStatus: TaskStatus,
    currentVersion: number,
  ) => void;
}

export function KanbanColumn({
  status,
  tasks,
  onStatusChange,
}: KanbanColumnProps) {
  const getColumnMeta = (colStatus: TaskStatus) => {
    switch (colStatus) {
      case "TODO":
        return {
          title: "To Do",
          icon: <Circle className="w-4 h-4 text-slate-400" />,
          accent: "border-t-slate-500",
          countColor: "bg-slate-800 text-slate-300",
        };
      case "IN_PROGRESS":
        return {
          title: "In Progress",
          icon: <Clock className="w-4 h-4 text-cyan-400" />,
          accent: "border-t-cyan-500",
          countColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
        };
      case "IN_REVIEW":
        return {
          title: "In Review",
          icon: <Eye className="w-4 h-4 text-indigo-400" />,
          accent: "border-t-indigo-500",
          countColor:
            "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
        };
      case "DONE":
        return {
          title: "Done",
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          accent: "border-t-emerald-500",
          countColor:
            "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        };
    }
  };

  const meta = getColumnMeta(status);

  return (
    <div
      className={`flex flex-col bg-slate-950/40 border border-slate-900 rounded-3xl p-4 min-h-[600px] border-t-4 ${meta.accent} shadow-xl backdrop-blur-sm`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          {meta.icon}
          <h3 className="font-semibold text-sm text-slate-200 tracking-tight">
            {meta.title}
          </h3>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${meta.countColor}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Task List */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4 border border-dashed border-slate-800/80 rounded-2xl">
            <Inbox className="w-6 h-6 text-slate-700 mb-2" />
            <p className="text-xs text-slate-500">
              No tasks in {meta.title.toLowerCase()}
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
}
