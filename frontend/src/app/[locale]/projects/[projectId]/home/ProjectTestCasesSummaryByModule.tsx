'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Divider, Button } from "@heroui/react";
import * as XLSX from "xlsx";

type StatusRow = { status: string; count: number };
type ModuleSummary = { module: string; total: number; statuses: StatusRow[] };
type ApiResp =
  | { success: true; projectId: number; totalModules: number; grandTotal: number; modules: ModuleSummary[] }
  | { success: false; error: string };

const STATUS_COLORS: Record<string, string> = {
  Pass: "#10B981",
  Fail: "#EF4444",
  Blocked: "#F59E0B",
  Skipped: "#6B7280",
  "In Progress": "#3B82F6",
  Unknown: "#94A3B8",
  "On Hold": "#6366F1",
  "Not Started": "#9CA3AF",
  Deferred: "#F97316",
  Destructive: "#EF4444",
  Enhancement: "#8B5CF6",
  "Integration Required": "#8B5CF6",
  "No Functionality": "#64748B",
  "No Requirement": "#0EA5E9",
  "Not Implemented": "#F97316",
};
type Props = { projectIdNum?: string ,buildId?: string };
export default function ProjectTestCasesSummaryByModule({ projectIdNum ,buildId}: Props) {
  const [projectId, setProjectId] = useState<string>(projectIdNum?? "");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>(""); // New filter state
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [grandTotal, setGrandTotal] = useState<number>(0);
  const [totalModules, setTotalModules] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BASE = process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.replace(/\/$/, "") || "";

  const fetchSummary = async (proj?: string) => {
    setLoading(true);
    setError(null);
    try {
      const pid = proj ?? projectId;
      const url = `${BASE}/api/kpis/getProjectTestCasesSummaryByModule?projectId=${encodeURIComponent(pid)}&runId=${encodeURIComponent(buildId??"")}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as ApiResp;
      if (!json.success) throw new Error((json as any).error || "API returned error");

      let filteredModules = json.modules;
      if (moduleFilter) {
        filteredModules = filteredModules.filter((m) =>
          m.module.toLowerCase().includes(moduleFilter.toLowerCase())
        );
      }
      if (statusFilter) {
        filteredModules = filteredModules.filter((m) =>
          m.statuses.some((s) => s.status === statusFilter && s.count > 0)
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
  }, [projectId, moduleFilter, statusFilter]);

  const allStatuses = useMemo(() => {
    const set = new Set<string>();
    modules.forEach((m) => m.statuses.forEach((s) => set.add(s.status)));
    return Array.from(set);
  }, [modules]);

  const overallTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    allStatuses.forEach((s) => (totals[s] = 0));
    let grand = 0;
    modules.forEach((mod) => {
      grand += mod.total;
      mod.statuses.forEach((s) => {
        totals[s.status] = (totals[s.status] || 0) + s.count;
      });
    });
    totals["__total__"] = grand;
    return totals;
  }, [modules, allStatuses]);

  const kpis = [
    { label: "Total Modules", value: totalModules },
    { label: "Total Testcases", value: grandTotal },
  ];

  const handleDownload = (type: "csv" | "xlsx") => {
    const exportData: any[] = [];

    modules.forEach((mod) => {
      const row: Record<string, any> = { Module: mod.module, Total: mod.total };
      allStatuses.forEach((status) => {
        const s = mod.statuses.find((x) => x.status === status);
        row[status] = s ? s.count : 0;
      });
      exportData.push(row);
    });

    const totalRow: Record<string, any> = { Module: "Total", Total: overallTotals["__total__"] };
    allStatuses.forEach((status) => {
      totalRow[status] = overallTotals[status] || 0;
    });
    exportData.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Module Status Summary");

    XLSX.writeFile(wb, type === "csv" ? "module_status_summary.csv" : "module_status_summary.xlsx", {
      bookType: type,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Project Testcases — Module Summary</h1>
          <p className="text-sm text-gray-500">Overview of all modules and their testcase status distribution.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="border px-2 py-1 rounded w-64"
            placeholder="Filter by module"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border px-2 py-1 rounded w-64"
          >
            <option value="">Filter by status</option>
            {Object.keys(STATUS_COLORS).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
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

      {/* Download Buttons */}
      <div className="flex justify-end gap-2 mt-4">
        <Button size="sm" color="primary" onPress={() => handleDownload("xlsx")}>Download Excel</Button>
        <Button size="sm" color="secondary" onPress={() => handleDownload("csv")}>Download CSV</Button>
      </div>

      {/* Error */}
      {error && <div className="text-red-600 mt-4 mb-2">{error}</div>}

      {/* Table */}
      <div className="overflow-x-auto mt-6">
        <table className="min-w-full border border-gray-300 bg-white rounded-lg shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-semibold border">Module</th>
              {allStatuses.map((status) => (
                <th key={status} className="px-3 py-2 text-center text-sm font-semibold border">
                  <span className="flex justify-center items-center gap-1">
                    <span className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLORS[status] || "#9CA3AF" }} />
                    {status}
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 text-center text-sm font-semibold border bg-gray-50">Total</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((mod) => (
              <tr key={mod.module} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-sm font-medium border">{mod.module}</td>
                {allStatuses.map((status) => {
                  const found = mod.statuses.find((s) => s.status === status);
                  const count = found ? found.count : 0;
                  const pct = mod.total > 0 ? ((count / mod.total) * 100).toFixed(1) : "0.0";
                  return (
                    <td key={status} className="px-3 py-2 text-center text-sm border">
                      {count} <span className="text-gray-500">({pct}%)</span>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center font-semibold border bg-gray-50">{mod.total}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 font-semibold">
            <tr>
              <td className="px-3 py-2 text-left">Total</td>
              {allStatuses.map((status) => {
                const count = overallTotals[status] || 0;
                const pct = overallTotals["__total__"] ? ((count / overallTotals["__total__"]) * 100).toFixed(1) : "0.0";
                return (
                  <td key={status} className="px-3 py-2 text-center">
                    {count} <span className="text-gray-500">({pct}%)</span>
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center bg-gray-50">{overallTotals["__total__"]}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!loading && modules.length === 0 && !error && (
        <div className="text-center text-gray-500 mt-10">No module data available.</div>
      )}
    </div>
  );
}
