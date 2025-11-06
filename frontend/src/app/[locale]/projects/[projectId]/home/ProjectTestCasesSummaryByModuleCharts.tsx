'use client';

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Divider } from "@heroui/react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type StatusRow = { status: string; count: number };
type ModuleSummary = { module: string; total: number; statuses: StatusRow[] };
type ApiResp =
  | { success: true; projectId: number; totalModules: number; grandTotal: number; modules: ModuleSummary[] }
  | { success: false; error: string };

const STATUS_COLORS: Record<string, string> = {
  Passed: "#10B981",
  Failed: "#EF4444",
  Blocked: "#F59E0B",
  Skipped: "#6B7280",
  "In Progress": "#3B82F6",
  Unknown: "#94A3B8",
  "On Hold": "#6366F1",
  "Not Started": "#9CA3AF",
};

export default function ProjectTestCasesSummaryByModuleCharts({ params }: { params?: any }) {
  const [projectId, setProjectId] = useState<string>(params?.projectId ? String(params.projectId) : "1");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [grandTotal, setGrandTotal] = useState<number>(0);
  const [totalModules, setTotalModules] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BASE = process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.replace(/\/$/, "") || "";

  // Fetch data
  const fetchSummary = async (proj?: string) => {
    setLoading(true);
    setError(null);
    try {
      const pid = proj ?? projectId;
      const url = `${BASE}/api/kpis/getProjectTestCasesSummaryByModule?projectId=${encodeURIComponent(pid)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as ApiResp;
      if (!json.success) throw new Error((json as any).error || "API returned error");

      let filteredModules = json.modules;
      if (moduleFilter) {
        filteredModules = filteredModules.filter(m =>
          m.module.toLowerCase().includes(moduleFilter.toLowerCase())
        );
      }

      setModules(filteredModules);
      setGrandTotal(json.grandTotal);
      setTotalModules(json.totalModules);
    } catch (err: any) {
      console.error("fetchSummary error:", err);
      setError(err.message || String(err));
      setModules([]);
      setGrandTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [projectId, moduleFilter]);

  // Top-level KPI cards
  const kpis = [
    { label: "Total Modules", value: totalModules },
    { label: "Total Testcases", value: grandTotal },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Project Testcases — Module Summary</h1>
          <p className="text-sm text-gray-500">Overview of all modules and their testcase status distribution.</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="border px-2 py-1 rounded w-64"
            placeholder="Filter by module"
          />
          <button
            onClick={() => fetchSummary(projectId)}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-60"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </header>

      {/* KPI Summary */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-lg shadow p-4 flex flex-col justify-center items-center"
          >
            <div className="text-sm text-gray-500">{kpi.label}</div>
            <div className="text-2xl font-semibold">{kpi.value}</div>
          </div>
        ))}
      </section>

      <Divider />

      {/* Error Handling */}
      {error && <div className="text-red-600 mt-4 mb-2">{error}</div>}

      {/* Module Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {modules.map((mod) => {
          const labels = mod.statuses.map((s) => s.status);
          const series = mod.statuses.map((s) => s.count);
          const colors = mod.statuses.map((s) => STATUS_COLORS[s.status] ?? "#9CA3AF");
          const total = mod.total;

          const donutOptions = {
            chart: { type: "donut", toolbar: { show: true } },
            labels,
            colors,
            legend: { position: "bottom" as const },
            tooltip: {
              y: { formatter: (val: number) => `${val} (${((val / total) * 100).toFixed(1)}%)` },
            },
          };

          return (
            <div key={mod.module} className="bg-white rounded-lg shadow p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">{mod.module}</h3>
                <span className="text-sm text-gray-500">Total: {mod.total}</span>
              </div>

              <div className="h-60">
                {typeof window !== "undefined" && (
                  <Chart options={donutOptions} series={series} type="donut" height={220} />
                )}
              </div>

              <div className="mt-3 text-sm">
                {mod.statuses.map((s) => {
                  const color = STATUS_COLORS[s.status] ?? "#9CA3AF";
                  const pct = ((s.count / mod.total) * 100).toFixed(1);
                  return (
                    <div key={s.status} className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
                        <span>{s.status}</span>
                      </div>
                      <span className="text-gray-600">{s.count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Empty state */}
      {!loading && modules.length === 0 && !error && (
        <div className="text-center text-gray-500 mt-10">
          No module data available.
        </div>
      )}
    </div>
  );
}
