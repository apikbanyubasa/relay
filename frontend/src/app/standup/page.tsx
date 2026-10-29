"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StandupReportView } from "../../components/standup/StandupReportView";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingCardSkeleton } from "../../components/ui/LoadingState";
import { Navbar } from "../../components/ui/Navbar";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../store/useAuthStore";
import type { ApiResponse, Project, StandupSummary } from "../../types";

export default function StandupPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, initialize } = useAuthStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Fetch Projects List for Scope Filtering
  const { data: projectsData } = useQuery<ApiResponse<Project[]>>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await apiClient.get("/api/projects");
      return res.data;
    },
    enabled: !!user,
  });

  const projects = projectsData?.data || [];

  const { data, isLoading, isError, refetch } = useQuery<
    ApiResponse<StandupSummary>
  >({
    queryKey: ["standup-summary", selectedProjectId],
    queryFn: async () => {
      const res = await apiClient.get("/api/reports/standup-summary", {
        params: selectedProjectId ? { project_id: selectedProjectId } : {},
      });
      return res.data;
    },
    enabled: !!user && user.role !== "CLIENT_GUEST",
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header & Project Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
              <span>Daily Standup Intelligence</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                24h Rolling Window
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Automated audit aggregation tracking completed deliverables and
              blocked dependencies
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold pl-2">
              Scope:
            </span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-slate-950 border border-slate-700 font-semibold text-xs text-slate-100 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value="">All Projects (Cross-Team Intel)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading || authLoading ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="h-20 bg-slate-900/60 rounded-3xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LoadingCardSkeleton />
              <LoadingCardSkeleton />
            </div>
          </div>
        ) : isError ? (
          <ErrorState
            title="Failed to generate standup intelligence"
            message="Unable to reach the audit aggregation engine. Please verify the backend is active."
            onRetry={() => refetch()}
          />
        ) : !data?.data ? (
          <EmptyState
            title="No Standup Activity"
            description="No audit logs recorded for the selected period."
          />
        ) : (
          <StandupReportView data={data.data} />
        )}
      </main>
    </div>
  );
}
