// file: app/dashboard/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Divider } from "@heroui/react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false }); // install react-apexcharts + apexcharts

type EnvRowRaw = {
  env_name: string | null;
  runs: number | string;
  passed: number | string;
  passPercent: number | string;
};

type EnvRow = {
  env_name: string | null;
  runs: number;
  passed: number;
  passPercent: number;
};

type SummaryResponseRaw = {
  total: number | string;
  passed: number | string;
  failed: number | string;
  in_progress: number | string;
  blocked?: number | string;
  retest?: number | string;
  skipped?: number | string;
  untested?: number | string;
  included_in_run: number | string;
  passPercent: number | string;
  flakyCount: number | string;
  avgDurationSeconds: number | string | null;
  executionsWithBugs: number | string;
  envBreakdown: EnvRowRaw[];
  generatedAt: string;
  // backend optional:
  statusCounts?: Record<string, number>; // e.g. { "Passed": 10, "Failed": 2, ... }
};

type SummaryResponse = {
  total: number;
  passed: number;
  failed: number;
  in_progress: number;
  blocked: number;
  retest: number;
  skipped: number;
  untested: number;
  included_in_run: number;
  passPercent: number;
  flakyCount: number;
  avgDurationSeconds: number | null;
  executionsWithBugs: number;
  envBreakdown: EnvRow[];
  generatedAt: string;
  statusCounts?: Record<string, number>;
};

type Props = { projectId?: string ,buildId?: string };

const STATUS_ORDER = [
   "Passed",
  "Failed",
  "In Progress",
  "Blocked",
  "Retest",
  "Skipped",
  "Untested",
];

const STATUS_COLORS: Record<string, string> = {
  "Untested": "#94a3b8", // gray
  "Passed": "#10b981", // green
  "Failed": "#ef4444", // red
  "In Progress": "#f59e0b", // amber
  "Blocked": "#7f1d1d", // dark red
  "Retest": "#3b82f6", // blue
  "Skipped": "#6b7280", // dark gray
};

export default function ExecutionsKpiPage({ projectId,buildId }: Props) {
  // editable project id
  const [projectIdState, setProjectIdState] = useState<string>(projectId ?? "");

  // filters
  const [runId, setRunId] = useState<string>(buildId?buildId:"");
  const [cycleType, setCycleType] = useState<string>("");
  const [envName, setEnvName] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [executedBy, setExecutedBy] = useState<string>(""); // user id

  // data
  const [kpi, setKpi] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProjectIdState(projectId ?? "");
  }, [projectId]);

  const buildQuery = (extra: Record<string, string | boolean | number | null> = {}) => {
    const params = new URLSearchParams();
    if (projectIdState) params.set("projectId", projectIdState);
    if (runId) params.set("run_id", runId);
    if (cycleType) params.set("cycle_type", cycleType);
    if (envName) params.set("env_name", envName);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    if (executedBy) params.set("executed_by", executedBy);
    Object.entries(extra).forEach(([k, v]) => {
      if (v !== null && v !== undefined && String(v) !== "") params.set(k, String(v));
    });
    return params.toString();
  };

  // normalize server payload to strong types
  const normalizeKpi = (raw: SummaryResponseRaw): SummaryResponse => {
    const toNum = (v: any, fallback = 0) => {
      if (v === null || v === undefined || v === "") return fallback;
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

    const envBreakdown: EnvRow[] = (raw.envBreakdown || []).map((r) => ({
      env_name: r.env_name ?? "unknown",
      runs: toNum(r.runs, 0),
      passed: toNum(r.passed, 0),
      passPercent: toNum(r.passPercent, 0),
    }));

    // build statusCounts if server didn't provide
    const statusCountsFromFields: Record<string, number> = {
      Passed: toNum(raw.passed),
      Failed: toNum(raw.failed),
      "In Progress": toNum(raw.in_progress),
      Blocked: toNum(raw.blocked),
      Retest: toNum(raw.retest),
      Untested: toNum(raw.untested),
      Skipped: toNum(raw.skipped),
    };

    const providedStatusCounts = raw.statusCounts;
    const finalStatusCounts = providedStatusCounts ? providedStatusCounts : statusCountsFromFields;

    return {
      total: toNum(raw.total),
      passed: toNum(raw.passed),
      failed: toNum(raw.failed),
      in_progress: toNum(raw.in_progress),
      blocked: toNum(raw.blocked),
      retest: toNum(raw.retest),
      skipped: toNum(raw.skipped),
      untested: toNum(raw.untested),
      included_in_run: toNum(raw.included_in_run),
      passPercent: toNum(raw.passPercent),
      flakyCount: toNum(raw.flakyCount),
      avgDurationSeconds: raw.avgDurationSeconds === null ? null : toNum(raw.avgDurationSeconds),
      executionsWithBugs: toNum(raw.executionsWithBugs),
      envBreakdown,
      generatedAt: raw.generatedAt,
      statusCounts: finalStatusCounts,
    };
  };

  const fetchKpi = async () => {
    setLoading(true);
    setError(null);
    try {
      const BASE =
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.replace(/\/$/, "") ||
  "http://localhost:6223"; // adjust to your server

      // adjust path to your API if needed
      const qs = buildQuery();
      const res = await fetch(`${BASE}/api/kpis?${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as SummaryResponseRaw;
      const normalized = normalizeKpi(json);
      setKpi(normalized);
    } catch (err: any) {
      console.error("fetchKpi error:", err);
      setError(err.message || String(err));
      setKpi(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initial load

  const onApply = () => fetchKpi();
  const onReset = () => {
    setProjectIdState(projectId ?? "");
    setRunId(""); setCycleType(""); setEnvName(""); setFromDate(""); setToDate(""); setExecutedBy("");
    setTimeout(fetchKpi, 0);
  };

  const onDownloadExcel = () => {
    const qs = buildQuery({ download: "excel" });
    window.open(`/api/executions/summary?${qs}`, "_blank");
  };

  // derive statusCounts (prefer server-provided)
  const statusCounts = useMemo(() => {
    const total = kpi?.total ?? 0;
    const server = kpi?.statusCounts;
    if (server) {
      return STATUS_ORDER.map((s) => {
        const count = server[s] ?? 0;
        const pct = total ? Math.round((count / total) * 1000) / 10 : 0;
        return { status: s, count, pct };
      });
    }
    // fallback synthesize
    const synthesized: Record<string, number> = {
      "Passed": kpi?.passed ?? 0,
      "Failed": kpi?.failed ?? 0,
      "In Progress": kpi?.in_progress ?? 0,
      "Blocked": kpi?.blocked ?? 0,
      "Retest": kpi?.retest ?? 0,
      "Untested": kpi?.untested ?? 0,
      "Skipped": kpi?.skipped ?? 0,
    };
    return STATUS_ORDER.map((s) => {
      const count = synthesized[s] ?? 0;
      const pct = total ? Math.round((count / total) * 1000) / 10 : 0;
      return { status: s, count, pct };
    });
  }, [kpi]);

  const donutOptions = {
    chart: { type: "donut", animations: { enabled: true }, toolbar: { show: false } },
    labels: statusCounts.map((s) => s.status),
    colors: statusCounts.map((s) => STATUS_COLORS[s.status] ?? "#9CA3AF"),
    legend: { position: "bottom" as const, horizontalAlign: "center" as const },
    responsive: [{ breakpoint: 640, options: { chart: { width: '100%' }, legend: { position: "bottom" } } }],
    tooltip: { y: { formatter: (val: number) => `${val} (${ (kpi?.total && kpi.total > 0) ? (Math.round((val/(kpi!.total))*1000)/10) : 0 }%)` } },
  };
  const donutSeries = statusCounts.map((s) => s.count);

  // env bar chart helpers
  const envCategories = useMemo(() => (kpi?.envBreakdown || []).map((r) => r.env_name ?? "unknown"), [kpi]);
  const envPassSeries = useMemo(() => (kpi?.envBreakdown || []).map((r) => Math.round(r.passPercent)), [kpi]);

  const barOptions: any = {
    chart: { type: "bar", toolbar: { show: false }, animations: { enabled: true } },
    plotOptions: { bar: { horizontal: true, barHeight: "40%" } },
    xaxis: { min: 0, max: 100, labels: { formatter: (v: number) => `${v}%` } },
    colors: ["#10b981"],
    tooltip: { y: { formatter: (v: number) => `${v}%` } },
    dataLabels: { enabled: true, formatter: (val: number) => `${val}%` },
  };

  const totalExecutions = kpi?.total ?? 0;
  const showLoadingOverlay = loading;

  // helpers
  const formatDuration = (secs?: number | null) => {
    if (!secs && secs !== 0) return "-";
    if (secs === null) return "-";
    const s = Math.floor(secs);
    if (s === 0) return "0s";
    const days = Math.floor(s / 86400);
    const hrs = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secsRem = s % 60;
    const parts: string[] = [];
    if (days) parts.push(`${days}d`);
    if (hrs) parts.push(`${hrs}h`);
    if (mins) parts.push(`${mins}m`);
    if (!days && !hrs && !mins) parts.push(`${secsRem}s`);
    return parts.join(" ");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Overall Test Runs Summary</h1>
          <p className="text-sm text-gray-500 mt-1">Status-based KPIs & environment overview — filter by executed_by, run, env, dates.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={onDownloadExcel} disabled={!kpi} className="px-4 py-2 border rounded bg-white hover:bg-gray-50 flex items-center gap-2 disabled:opacity-60">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M12 3v12" stroke="currentColor" strokeWidth="1.5"/><path d="M8 11l4 4 4-4" stroke="currentColor" strokeWidth="1.5"/></svg>
            Download
          </button>

          <button onClick={fetchKpi} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:brightness-95 flex items-center gap-2">
            {loading ? <span className="animate-pulse">Loading…</span> : <span>Refresh</span>}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 101.5-5.1" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
        </div>
      </header>

      {/* Filters */}
      <section className="bg-white rounded-md shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-600">Run ID</label>
            <input value={runId} onChange={(e) => setRunId(e.target.value)} placeholder="run id" className="mt-1 w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Cycle type</label>
            <select value={cycleType} onChange={(e) => setCycleType(e.target.value)} className="mt-1 w-full border rounded px-2 py-1">
              <option value="">All</option>
              <option value="Regression">Regression</option>
              <option value="Smoke">Smoke</option>
              <option value="Sanity">Sanity</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600">Environment</label>
            <input value={envName} onChange={(e) => setEnvName(e.target.value)} placeholder="env name" className="mt-1 w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Executed By (user id)</label>
            <input value={executedBy} onChange={(e) => setExecutedBy(e.target.value)} placeholder="user id" type="number" className="mt-1 w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="block text-xs text-gray-600">From date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="block text-xs text-gray-600">To date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
          </div>

          <div className="flex gap-2">
            <button onClick={onApply} className="px-3 py-1 bg-green-600 text-white rounded">Apply</button>
            <button onClick={onReset} className="px-3 py-1 border rounded">Reset</button>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-500">Last generated: {kpi ? new Date(kpi.generatedAt).toLocaleString() : "-"}</div>
      </section>
<Divider/>
      {/* Top KPI summary row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-md shadow p-4">
          <div className="text-sm text-gray-500">Total Executions</div>
          <div className="text-2xl font-semibold mt-1">{kpi ? kpi.total : "-"}</div>
          <div className="text-xs text-gray-400 mt-1">Included in run: {kpi ? kpi.included_in_run : "-"}</div>
        </div>

       

        <div className="bg-white rounded-md shadow p-4">
          <div className="text-sm text-gray-500">Flaky Count</div>
          <div className="text-2xl font-semibold mt-1">{kpi ? kpi.flakyCount : "-"}</div>
          <div className="text-xs text-gray-400 mt-1">Distinct test cases with both passes and failures in recent runs</div>
        </div>

         <div className="bg-white rounded-md shadow p-4">
          <div className="text-sm text-gray-500">Bugs</div>
          <div className="text-2xl font-semibold mt-1">{kpi ? kpi.executionsWithBugs : "-"}</div>
          <div className="text-xs text-gray-400 mt-1">
            Executions with bugs: {kpi ? kpi.executionsWithBugs : "-"}
         </div>
         </div>

        <div className="bg-white rounded-md shadow p-4">
          <div className="text-sm text-gray-500">Avg Duration</div>
          <div className="text-2xl font-semibold mt-1">{kpi ? formatDuration(kpi.avgDurationSeconds) : "-"}</div>
          <div className="text-xs text-gray-400 mt-1">Avg seconds: {kpi?.avgDurationSeconds ?? "-"}</div>
        </div>
      </section>

      {/* KPI cards + donut */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* KPI grid for each status */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {statusCounts.map((s) => (
            <StatusKpiCard
              key={s.status}
              status={s.status}
              count={s.count}
              pct={s.pct}
              total={totalExecutions}
              color={STATUS_COLORS[s.status]}
            />
          ))}
        </div>

        {/* Donut */}
        <div className="bg-white rounded-md shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Status Distribution</h3>
            <div className="text-sm text-gray-500">Counts & proportions</div>
          </div>

          <div className="w-full h-64">
            {typeof window === "undefined" ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Chart unavailable on server</div>
            ) : (
              <Chart options={donutOptions} series={donutSeries} type="donut" width="100%" height={320} />
            )}
          </div>

          {/* <div className="mt-3 grid grid-cols-2 gap-2">
            {statusCounts.map((s) => (
              <div key={s.status} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-2 py-1">
                <span className="w-3 h-3 rounded" style={{ background: STATUS_COLORS[s.status] }} />
                <div className="flex-1">
                  <div className="font-medium">{s.status}</div>
                  <div className="text-xs text-gray-500">{s.count} · {s.pct}%</div>
                </div>
              </div>
            ))}
          </div> */}
        </div>
      </section>

      {/* Env bar */}
      <section className="bg-white rounded-md shadow p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Environment Pass %</h2>
          <div className="text-sm text-gray-500">Top environments</div>
        </div>

        {kpi?.envBreakdown && kpi.envBreakdown.length > 0 ? (
          <div className="w-full h-56">
            <Chart
              options={{ ...barOptions, xaxis: { ...barOptions.xaxis, categories: envCategories } }}
              series={[{ name: "Pass %", data: envPassSeries }]}
              type="bar"
              height={220}
            />
          </div>
        ) : (
          <div className="text-sm text-gray-500">No environment data</div>
        )}
      </section>

      {/* loading overlay */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-black opacity-20 absolute inset-0" />
          <div className="relative z-10 p-4 bg-white rounded shadow flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-600 animate-ping"></div>
            <div>Refreshing KPIs…</div>
          </div>
        </div>
      )}

      {error && <div className="text-red-600 mt-4">{error}</div>}
      <footer className="text-sm text-gray-500 mt-6">Tip: include <code>executed_by</code> filter to see KPIs for a specific user.</footer>
    </div>
  );
}

/* small helpers & constants for env chart */
const barOptions: any = {
  chart: { type: "bar", toolbar: { show: false }, animations: { enabled: true } },
  plotOptions: { bar: { horizontal: true, barHeight: "36%" } },
  xaxis: { min: 0, max: 100, labels: { formatter: (v: number) => `${v}%` } },
  tooltip: { y: { formatter: (v: number) => `${v}%` } },
  dataLabels: { enabled: true, formatter: (val: number) => `${val}%` },
  theme: { mode: "light" },
};

/* Status KPI card component */
function StatusKpiCard({ status, count, pct, total, color }: { status: string; count: number; pct: number; total: number; color?: string }) {
  const safeColor = color ?? "#94a3b8";
  const percent = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
  return (
    <div className="bg-white rounded-md shadow p-3 transform hover:-translate-y-0.5 transition">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">{status}</div>
          <div className="mt-1 text-xl font-semibold">{count}</div>
          <div className="text-xs text-gray-400 mt-1">{percent}% of total</div>
        </div>

        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: safeColor + "22" }}>
          <div className="text-sm font-medium" style={{ color: safeColor }}>{pct}%</div>
        </div>
      </div>

      {/* small progress bar */}
      <div className="mt-3 bg-gray-100 rounded h-2 overflow-hidden">
        <div style={{ width: `${percent}%`, background: safeColor }} className="h-2 transition-all" />
      </div>
    </div>
  );
}
