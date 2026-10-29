"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  RefreshCw,
  Search,
  UserCheck,
  User as UserIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../lib/api-client";
import { formatDate } from "../../lib/utils";
import { useAuthStore } from "../../store/useAuthStore";
import { useTaskStore } from "../../store/useTaskStore";
import type { ApiResponse, Department, Task, TaskStatus } from "../../types";

interface DeliverablesTableViewProps {
  projectId: string;
}

export function DeliverablesTableView({
  projectId,
}: DeliverablesTableViewProps) {
  const { user } = useAuthStore();
  const { setSelectedTask, onlyMyTasks, setOnlyMyTasks } = useTaskStore();

  // Filter & Pagination States
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [visFilter, setVisFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(10);
  const [orderKey, setOrderKey] = useState<string>("created_at");
  const [orderRule, setOrderRule] = useState<"asc" | "desc">("desc");

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1); // Reset to first page on search change
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Construct Relay ezfilter query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();

    // filters: exact matches
    const filters: Record<string, unknown> = {};
    if (projectId) filters.project_id = projectId;
    if (deptFilter !== "ALL") filters.department = deptFilter;
    if (statusFilter !== "ALL") filters.status = statusFilter;
    if (visFilter === "VISIBLE") filters.client_visible = true;
    if (visFilter === "INTERNAL") filters.client_visible = false;
    if (onlyMyTasks && user?.id) filters.assignee_id = user.id;

    if (Object.keys(filters).length > 0) {
      params.set("filters", JSON.stringify(filters));
    }

    // searchFilters: substring contains
    if (debouncedSearch) {
      params.set("searchFilters", JSON.stringify({ title: debouncedSearch }));
    }

    // pagination & sorting
    params.set("page", String(page));
    params.set("rows", String(rows));
    params.set("orderKey", orderKey);
    params.set("orderRule", orderRule);

    return params.toString();
  }, [
    projectId,
    deptFilter,
    statusFilter,
    visFilter,
    onlyMyTasks,
    user?.id,
    debouncedSearch,
    page,
    rows,
    orderKey,
    orderRule,
  ]);

  // Fetch tasks using server query contract with smooth transitions (keepPreviousData)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    ApiResponse<Task[]>
  >({
    queryKey: ["tasks-table", queryParams],
    queryFn: async () => {
      const res = await apiClient.get(`/api/tasks?${queryParams}`);
      return res.data;
    },
    enabled: !!projectId,
    placeholderData: keepPreviousData,
  });

  const tasks = data?.data || [];
  const meta = data?.meta;
  const totalRows = meta?.totalRows ?? 0;
  const totalPages = meta?.totalPages ?? 1;

  // Sorting helper
  const handleSort = (key: string) => {
    if (orderKey === key) {
      setOrderRule((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderKey(key);
      setOrderRule("asc");
    }
    setPage(1);
  };

  const getSortIcon = (key: string) => {
    if (orderKey !== key) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 opacity-60" />;
    }
    return orderRule === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
    );
  };

  // Badge helpers
  const getDepartmentStyle = (dept: Department | string) => {
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

  const getStatusBadge = (status: TaskStatus | string) => {
    switch (status) {
      case "DONE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
      case "IN_REVIEW":
        return "bg-amber-500/10 text-amber-400 border-amber-500/25";
      case "IN_PROGRESS":
        return "bg-blue-500/10 text-blue-400 border-blue-500/25";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const resetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setDeptFilter("ALL");
    setStatusFilter("ALL");
    setVisFilter("ALL");
    setOnlyMyTasks(false);
    setPage(1);
    setOrderKey("created_at");
    setOrderRule("desc");
  };

  const hasActiveFilters =
    debouncedSearch !== "" ||
    deptFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    visFilter !== "ALL" ||
    onlyMyTasks;

  return (
    <div className="space-y-5">
      {/* Control Bar: Search + Filters */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input with Contract Substring Indicator */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search deliverables (title contains)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">
                  All Disciplines
                </option>
                <option value="PRODUCT" className="bg-slate-900">
                  Product
                </option>
                <option value="UI_UX" className="bg-slate-900">
                  UI/UX
                </option>
                <option value="FRONTEND" className="bg-slate-900">
                  Frontend
                </option>
                <option value="BACKEND" className="bg-slate-900">
                  Backend
                </option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <span className="text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">
                  All Statuses
                </option>
                <option value="TODO" className="bg-slate-900">
                  TODO
                </option>
                <option value="IN_PROGRESS" className="bg-slate-900">
                  IN PROGRESS
                </option>
                <option value="IN_REVIEW" className="bg-slate-900">
                  IN REVIEW
                </option>
                <option value="DONE" className="bg-slate-900">
                  DONE
                </option>
              </select>
            </div>

            {/* Client Visibility Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <span className="text-slate-500">Scope:</span>
              <select
                value={visFilter}
                onChange={(e) => {
                  setVisFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">
                  All Visibility
                </option>
                <option value="VISIBLE" className="bg-slate-900">
                  Client Visible Only
                </option>
                <option value="INTERNAL" className="bg-slate-900">
                  Internal Only
                </option>
              </select>
            </div>

            {/* My Tasks Personal Filter */}
            <button
              type="button"
              onClick={() => {
                setOnlyMyTasks(!onlyMyTasks);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                onlyMyTasks
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-bold border border-cyan-400 shadow-sm shadow-cyan-500/20"
                  : "bg-slate-950/80 text-slate-300 hover:text-slate-100 hover:bg-slate-800 border border-slate-800"
              }`}
              title="Show deliverables assigned to me"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>My Tasks</span>
            </button>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
              >
                Reset
              </button>
            )}

            {/* Refresh */}
            <button
              type="button"
              onClick={() => refetch()}
              title="Refresh deliverables data"
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 border border-slate-800 transition-all cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-cyan-400" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Query Contract Diagnostic Hint */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60 pt-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-cyan-400/90 font-semibold">
              Relay Query Engine
            </span>
            <span>contract active</span>
          </div>
          <div className="font-mono text-[10px] text-slate-400">
            Total Matched:{" "}
            <span className="text-cyan-400 font-bold">{totalRows}</span> records
          </div>
        </div>
      </div>

      {/* 4 UI STATES */}
      {/* 1. Loading State */}
      {isLoading ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 animate-pulse">
          <div className="h-10 bg-slate-800/60 rounded-xl" />
          <div className="h-12 bg-slate-800/40 rounded-xl" />
          <div className="h-12 bg-slate-800/40 rounded-xl" />
          <div className="h-12 bg-slate-800/40 rounded-xl" />
          <div className="h-12 bg-slate-800/40 rounded-xl" />
        </div>
      ) : isError ? (
        /* 2. Error State */
        <div className="bg-rose-950/20 border border-rose-900/60 rounded-2xl p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <h3 className="text-base font-bold text-rose-200">
            Failed to query deliverables
          </h3>
          <p className="text-xs text-rose-300/80 max-w-md mx-auto">
            {error instanceof Error
              ? error.message
              : "Server query contract returned an error."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 cursor-pointer"
          >
            Retry Query
          </button>
        </div>
      ) : tasks.length === 0 ? (
        /* 3. Empty State */
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-500">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-200">
            No Deliverables Found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No deliverables match the active query filters. Try adjusting your
            search keyword or discipline filter.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30 cursor-pointer transition-all"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        /* 4. Success State: Interactive Data Table */
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-950/70 border-b border-slate-800/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th
                    scope="col"
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                    onClick={() => handleSort("title")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Deliverable Title</span>
                      {getSortIcon("title")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                    onClick={() => handleSort("department")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Discipline</span>
                      {getSortIcon("department")}
                    </div>
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    <span>Assignee</span>
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      {getSortIcon("status")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                    onClick={() => handleSort("due_date")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Due Date</span>
                      {getSortIcon("due_date")}
                    </div>
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-center">
                    <span>Visibility</span>
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right">
                    <span>Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Title + DAG Blocked Status */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                          {task.title}
                        </div>
                        {task.isBlocked && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>
                              Blocked ({task.pendingDependencies?.length || 1}{" "}
                              prerequisites)
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Discipline Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${getDepartmentStyle(
                          task.department,
                        )}`}
                      >
                        {task.department}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="py-3.5 px-4">
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-cyan-400 shrink-0">
                            {task.assignee.name.charAt(0)}
                          </div>
                          <span className="text-slate-200 text-xs font-medium">
                            {task.assignee.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs italic flex items-center gap-1">
                          <UserIcon className="w-3 h-3" /> Unassigned
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getStatusBadge(
                          task.status,
                        )}`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {task.due_date ? formatDate(task.due_date) : "—"}
                    </td>

                    {/* Visibility */}
                    <td className="py-3.5 px-4 text-center">
                      {task.client_visible ? (
                        <span
                          title="Visible to Client Guests"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20"
                        >
                          <Eye className="w-3 h-3" /> Public
                        </span>
                      ) : (
                        <span
                          title="Internal only"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700"
                        >
                          <EyeOff className="w-3 h-3 text-slate-500" /> Internal
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-800/90 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 hover:bg-slate-800 transition-all cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer */}
          <div className="bg-slate-950/80 border-t border-slate-800/80 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            {/* Rows per page selector */}
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={rows}
                onChange={(e) => {
                  setRows(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-slate-500">
                Page {page} of {totalPages} ({totalRows} total)
              </span>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={
                  meta?.hasPrev !== undefined ? !meta.hasPrev : page <= 1
                }
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-200 bg-slate-900 border border-slate-800 rounded-lg">
                {page}
              </span>
              <button
                type="button"
                disabled={
                  meta?.hasNext !== undefined
                    ? !meta.hasNext
                    : page >= totalPages
                }
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
