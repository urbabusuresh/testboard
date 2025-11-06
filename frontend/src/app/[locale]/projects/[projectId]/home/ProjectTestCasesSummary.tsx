// file: app/dashboard/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Divider } from "@heroui/react"; // optional, keep if you have it

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type StatusRow = { status: string; count: number };
type ApiResp = { success: true; data: StatusRow[]; total: number } | { success: false; error: string };

const STATUS_COLORS: Record<string, string> = {
  Skipped: "#6B7280",
  Pass: "#10B981",
  Unknown: "#94A3B8",
  Failed: "#EF4444",
  Blocked: "#EF4444",
  "On Hold": "#6366F1",
  "Integration Required": "#8B5CF6",
  Deferred: "#F59E0B",
  "Need Dev Clarification": "#FB7185",
  "Not Implemented": "#F97316",
  "Not Started": "#374151",
  "In Progress": "#3B82F6",
  "No Requirement": "#64748B",
  "Out Of Scope": "#94A3B8",
  "Not Required": "#0EA5E9",
};
type Props = { projectIdNum?: string ,buildId?: string };
export default function ProjectTestCasesSummary({ projectIdNum ,buildId}: Props) {
  const [projectId, setProjectId] = useState<string>(projectIdNum ?? "");
   const [runId, setrunId] = useState<string>(buildId ?? "");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // fetcher - adjust BASE if your API is on different host
  const BASE = process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.replace(/\/$/, "") || "";

  const fetchSummary = async (proj?: string) => {
    setLoading(true);
    setError(null);
    try {
      const pid = proj ?? projectId;
      if (!pid) throw new Error("projectId missing");
      
      // Build URL with query parameters
      let url = (BASE ? `${BASE}` : "") + `/api/kpis/getProjectTestCasesSummary?projectId=${encodeURIComponent(pid)}&runId=${encodeURIComponent(runId)}`;
      
      // Add module filter if provided
      if (moduleFilter) {
        url += `&module=${encodeURIComponent(moduleFilter)}`;
      }
      
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as ApiResp;
      if (!json.success) throw new Error((json as any).error || "API returned error");
      // ensure normalized shape
      const normalized = json.data.map((r) => ({ status: String(r.status ?? "Unknown"), count: Number(r.count ?? 0) }));
      setRows(normalized);
      setTotal(Number(json.total ?? normalized.reduce((s, r) => s + r.count, 0)));
    } catch (err: any) {
      console.error("fetchSummary error:", err);
      setError(err.message || String(err));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, moduleFilter]);

  // prepare donut series and options
  const labels = useMemo(() => rows.map((r) => r.status), [rows]);
  const series = useMemo(() => rows.map((r) => r.count), [rows]);
  const colors = useMemo(() => rows.map((r) => STATUS_COLORS[r.status] ?? "#9CA3AF"), [rows]);

  const donutOptions = useMemo(() => ({
    chart: { type: "donut", toolbar: { show: false } },
    labels,
    colors,
    legend: { position: "bottom" as const },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} (${total ? Math.round((val / total) * 1000) / 10 : 0}%)`
      }
    },
    responsive: [{ breakpoint: 640, options: { chart: { width: '100%' } } }]
  }), [labels, colors, total]);

  // derive summary cards: top 6 statuses by count
  const topCards = useMemo(() => {
    return [...rows].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [rows]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Project Testcases — Status Summary</h1>
          <p className="text-sm text-gray-500">Shows status counts for projectId.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="border px-2 py-1 rounded w-full sm:w-64"
              placeholder="Filter by module (comma separated)"
            />
            <button
              onClick={() => fetchSummary(projectId)}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-60"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      <Divider />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 my-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topCards.map((c) => {
            const pct = total ? Math.round((c.count / total) * 1000) / 10 : 0;
            const color = STATUS_COLORS[c.status] ?? "#9CA3AF";
            return (
              <div key={c.status} className="bg-white rounded shadow p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">{c.status}</div>
                  <div className="text-xl font-semibold">{c.count}</div>
                  <div className="text-xs text-gray-400">{pct}% of total</div>
                </div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: color + "22" }}>
                  <div style={{ color }} className="font-medium">{pct}%</div>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="bg-white rounded shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Status distribution</h3>
            <div className="text-sm text-gray-500">Total: {total}</div>
          </div>

          <div className="w-full h-64">
            {typeof window === "undefined" ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Chart unavailable on server</div>
            ) : (
              <Chart options={donutOptions} series={series} type="donut" width="100%" height={320} />
            )}
          </div>
        </aside>
      </section>

      <section className="bg-white rounded shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Detailed breakdown</h3>
          <div className="text-sm text-gray-500">{rows.length} statuses</div>
        </div>

        {error && <div className="text-red-600 mb-3">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm table-auto">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Status</th>
                <th className="py-2">Count</th>
                <th className="py-2">Percent</th>
                <th className="py-2">Progress</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = total ? ((r.count / total) * 100) : 0;
                const color = STATUS_COLORS[r.status] ?? "#9CA3AF";
                return (
                  <tr key={r.status} className="border-t">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
                        <div className="font-medium">{r.status}</div>
                      </div>
                    </td>
                    <td className="py-3 font-semibold">{r.count}</td>
                    <td className="py-3">{pct.toFixed(1)}%</td>
                    <td className="py-3 w-1/3">
                      <div className="h-2 bg-gray-100 rounded overflow-hidden">
                        <div style={{ width: `${pct}%`, background: color }} className="h-2" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* <div className="mt-4 text-xs text-gray-500">API: <code>/api/executions/getProjectTestCasesSummary?projectId=1</code></div> */}
    </div>
  );
}
