// app/dashboard/UserSummaryPanel.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type UserSummaryRow = {
  executed_by: string;
  total_executions: number;
  passed: number;
  failed: number;
  passPercent: number;
  flaky_count: number;
  reruns: number;
  avg_duration_seconds: number | null;
  total_executions_prev?: number;
  passed_prev?: number;
  flaky_count_prev?: number;
  reruns_prev?: number;
  passPercent_prev?: number;
  total_executions_change_pct?: number | null;
  passed_change_pct?: number | null;
  passPercent_change_pct?: number | null;
  flaky_change_pct?: number | null;
  reruns_change_pct?: number | null;
};

type DailyRow = {
  day: string; // YYYY-MM-DD
  executed_by: string;
  total_executions: number | string;
  passed?: number | string;
  failed?: number | string;
  skipped?: number | string;
  in_progress?: number | string;
  included_in_run?: number | string;
  distinct_testcases?: number | string;
};

type RawExecutionRow = {
  execution_id: string;
  run_id: string;
  testcase_id: string;
  cycle_number: string;
  cycle_type: string;
  status: string;
  include_in_run: string | number;
  preparation_start?: string | null;
  preparation_end?: string | null;
  executed_at?: string | null;
  bug_ids?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  env_name?: string | null;
  projectId?: string | null;
  executed_by?: string | null;
  test_data?: string | null;
  remarks?: string | null;
};

type Props = { projectId?: string ,buildId?: string };

export default function UserSummaryPanel({ projectId ,buildId}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ userSummary: UserSummaryRow[]; userDaily: DailyRow[] } | null>(null);

  // filters
  const [runId, setRunId] = useState<string>(buildId?buildId:"");
  const [testcaseId, setTestcaseId] = useState<string>("");
  const [executedBy, setExecutedBy] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [compareDays, setCompareDays] = useState<number>(7);

  // UI state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, RawExecutionRow[]>>({});
  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const BASE =
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.replace(/\/$/, "") ||
    "http://localhost:6223";

  const buildQuery = () => {
    const q = new URLSearchParams();
    if (projectId) q.set("projectId", projectId);
    if (runId) q.set("run_id", runId);
    if (testcaseId) q.set("testcase_id", testcaseId);
    if (executedBy) q.set("executed_by", executedBy);
    if (fromDate) q.set("fromDate", fromDate);
    if (toDate) q.set("toDate", toDate);
    if (compareDays) q.set("compareDays", String(compareDays));
    return q.toString();
  };

  async function fetchSummary() {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQuery();
      const res = await fetch(`${BASE}/api/kpis/userwise?${qs}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const userDaily: DailyRow[] = (json.userDaily || []).map((r: any) => ({
        ...r,
        total_executions: Number(r.total_executions || 0),
        passed: r.passed !== undefined ? Number(r.passed) : undefined,
        failed: r.failed !== undefined ? Number(r.failed) : undefined,
        skipped: r.skipped !== undefined ? Number(r.skipped) : undefined,
        in_progress: r.in_progress !== undefined ? Number(r.in_progress) : undefined,
        included_in_run: r.included_in_run !== undefined ? Number(r.included_in_run) : undefined,
        distinct_testcases: r.distinct_testcases !== undefined ? Number(r.distinct_testcases) : undefined,
      }));

      const userSummary: UserSummaryRow[] = (json.userSummary || []).map((u: any) => ({
        executed_by: String(u.executed_by ?? "UNASSIGNED"),
        total_executions: Number(u.total_executions ?? 0),
        passed: Number(u.passed ?? 0),
        failed: Number(u.failed ?? 0),
        passPercent: Number(u.passPercent ?? 0),
        flaky_count: Number(u.flaky_count ?? 0),
        reruns: Number(u.reruns ?? 0),
        avg_duration_seconds: u.avg_duration_seconds === null ? null : Number(u.avg_duration_seconds),
        total_executions_prev: Number(u.total_executions_prev ?? 0),
        passed_prev: Number(u.passed_prev ?? 0),
        flaky_count_prev: Number(u.flaky_count_prev ?? 0),
        reruns_prev: Number(u.reruns_prev ?? 0),
        passPercent_prev: Number(u.passPercent_prev ?? 0),
        total_executions_change_pct: u.total_executions_change_pct ?? null,
        passed_change_pct: u.passed_change_pct ?? null,
        passPercent_change_pct: u.passPercent_change_pct ?? null,
        flaky_change_pct: u.flaky_change_pct ?? null,
        reruns_change_pct: u.reruns_change_pct ?? null,
      }));

      setData({ userSummary, userDaily });
    } catch (err: any) {
      console.error(err);
      setError(err.message || String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // group daily by user
  const dailyByUser = useMemo(() => {
    const map = new Map<string, DailyRow[]>();
    (data?.userDaily || []).forEach((r) => {
      const arr = map.get(r.executed_by) || [];
      arr.push(r);
      map.set(r.executed_by, arr);
    });
    for (const [k, arr] of map.entries()) arr.sort((a, b) => a.day.localeCompare(b.day));
    return map;
  }, [data]);

  // apex options for small sparkline
  const sparkOptions = (values: number[]) => ({
    chart: {
      type: "area",
      sparkline: { enabled: true },
      animations: { enabled: true },
      toolbar: { show: false },
    },
    stroke: { width: 2, curve: "smooth" as const },
    tooltip: { enabled: true, theme: "light" as const },
    fill: { opacity: 0.12 },
    yaxis: { min: 0 },
  });

  // fetch raw executions for a user and optionally a day
  async function fetchRawExecutions(user: string, day?: string, limit = 200, offset = 0) {
    setRawLoading(true);
    setRawError(null);
    try {
      const q = new URLSearchParams();
      if (projectId) q.set("projectId", projectId);
      q.set("executed_by", user);
      if (day) q.set("day", day);
      q.set("limit", String(limit));
      q.set("offset", String(offset));
      const res = await fetch(`${BASE}/api/kpis/executionsRaw?${q.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const rows: RawExecutionRow[] = await res.json();
      setRawRows((s) => ({ ...(s || {}), [user + (day ? ":" + day : "")]: rows }));
      setSelectedUser(user);
    } catch (err: any) {
      console.error(err);
      setRawError(err.message || String(err));
    } finally {
      setRawLoading(false);
    }
  }

  function formatDuration(s: number | null | undefined) {
    if (s === null || s === undefined) return "-";
    const sec = Math.floor(s);
    if (sec === 0) return "0s";
    const days = Math.floor(sec / 86400);
    const hrs = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (days) return `${days}d ${hrs}h`;
    if (hrs) return `${hrs}h ${mins}m`;
    if (mins) return `${mins}m`;
    return `${sec}s`;
  }

  const pctColor = (p: number) => {
    if (p >= 80) return "bg-green-100 text-green-800";
    if (p >= 50) return "bg-yellow-100 text-yellow-800";
    if (p > 0) return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
  };
  const changeColor = (v: number | null | undefined) => {
    if (v === null) return "text-gray-500";
    if (v > 0) return "text-green-600";
    if (v < 0) return "text-red-600";
    return "text-gray-500";
  };

  const toggleRow = (key: string) => setExpanded((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">User-wise Test KPIs</h2>
          <p className="text-sm text-gray-500">Click a row to expand. Interactive sparklines & raw executions available.</p>
        </div>

        <div className="flex gap-2">
          <button onClick={fetchSummary} disabled={loading} className="px-3 py-1 bg-blue-600 text-white rounded">Refresh</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-md shadow mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
          <div>
            <label className="block text-xs text-gray-600">Run ID</label>
            <input className="mt-1 w-full border px-2 py-1 rounded" value={runId} onChange={(e) => setRunId(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Testcase ID</label>
            <input className="mt-1 w-full border px-2 py-1 rounded" value={testcaseId} onChange={(e) => setTestcaseId(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Executed By</label>
            <input className="mt-1 w-full border px-2 py-1 rounded" value={executedBy} onChange={(e) => setExecutedBy(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs text-gray-600">From</label>
            <input type="date" className="mt-1 w-full border px-2 py-1 rounded" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs text-gray-600">To</label>
            <input type="date" className="mt-1 w-full border px-2 py-1 rounded" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Compare Days</label>
            <input type="number" min={1} className="mt-1 w-full border px-2 py-1 rounded" value={compareDays} onChange={(e) => setCompareDays(Number(e.target.value))} />
          </div>

          <div className="col-span-full flex gap-2 justify-end mt-2">
            <button onClick={() => { setFromDate(""); setToDate(""); setRunId(""); setTestcaseId(""); setExecutedBy(""); fetchSummary(); }} className="px-3 py-1 border rounded">Reset</button>
            <button onClick={fetchSummary} className="px-3 py-1 bg-green-600 text-white rounded">Apply</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-3">User</th>
              <th className="p-3">Total</th>
              <th className="p-3">Passed</th>
              <th className="p-3">Failed</th>
              <th className="p-3">Pass %</th>
              <th className="p-3">Flaky</th>
              <th className="p-3">Reruns</th>
              <th className="p-3">Avg Duration</th>
              <th className="p-3">Trend</th>
              <th className="p-3"></th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr><td colSpan={10} className="p-6 text-center">Loading…</td></tr>
            )}

            {!loading && error && (
              <tr><td colSpan={10} className="p-6 text-red-600">{error}</td></tr>
            )}

            {!loading && !error && data && data.userSummary.length === 0 && (
              <tr><td colSpan={10} className="p-6 text-center text-gray-500">No data for selected filters</td></tr>
            )}

            {!loading && !error && (data?.userSummary || []).map((u) => {
              const seriesRows = dailyByUser.get(u.executed_by) || [];
              const values = seriesRows.map((s) => Number(s.total_executions || 0));
              const sparkSeries = values.length ? [{ data: values }] : [{ data: [0] }];

              return (
                <React.Fragment key={u.executed_by}>
                  <tr
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleRow(u.executed_by)}
                    title="Click to expand for daily details"
                  >
                    <td className="p-3 font-medium">{u.executed_by}</td>

                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-semibold">{u.total_executions}</div>
                        <div className="text-xs text-gray-500">runs</div>
                      </div>
                      <div className="text-xs text-gray-400">cases: {u.distinct_testcases}</div>
                    </td>

                    <td className="p-3"><span className="px-2 py-0.5 rounded text-sm bg-green-50 text-green-700 font-medium">{u.passed}</span></td>

                    <td className="p-3"><span className="px-2 py-0.5 rounded text-sm bg-red-50 text-red-700 font-medium">{u.failed}</span></td>

                    <td className="p-3">
                      <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded text-sm ${pctColor(u.passPercent)}`}>
                        <span className="font-semibold">{u.passPercent}%</span>
                      </div>
                      <div className="text-xs mt-1">
                        <span className={changeColor(u.passPercent_change_pct)}>{
                          u.passPercent_change_pct === null ? "new" :
                            (u.passPercent_change_pct === 0 ? "—" : `${u.passPercent_change_pct}%`)
                        }</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-sm bg-orange-50 text-orange-700 font-medium">{u.flaky_count}</span>
                        <div className="text-xs text-gray-500">prev {u.flaky_count_prev ?? 0}</div>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="text-sm">{u.reruns}</div>
                      <div className="text-xs text-gray-400">prev {u.reruns_prev ?? 0}</div>
                    </td>

                    <td className="p-3">{formatDuration(u.avg_duration_seconds)}</td>

                    <td className="p-3 w-40">
                      <div style={{ width: 120 }}>
                        <Chart
                          options={sparkOptions(values)}
                          series={sparkSeries as any}
                          type="area"
                          width={120}
                          height={36}
                        />
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <button onClick={(e) => { e.stopPropagation(); fetchRawExecutions(u.executed_by); }} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs">Raw</button>
                    </td>
                  </tr>

                  <AnimatePresence initial={false}>
                    {expanded[u.executed_by] && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28 }}
                        className="bg-gray-50"
                      >
                        <td colSpan={10} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <h4 className="font-semibold">Summary</h4>
                              <div className="mt-2 text-sm text-gray-700 grid grid-cols-2 gap-2">
                                <div>Executed by: <span className="font-medium">{u.executed_by}</span></div>
                                <div>Total runs: <span className="font-medium">{u.total_executions}</span></div>
                                <div>Distinct cases: <span className="font-medium">{u.distinct_testcases}</span></div>
                                <div>Reruns: <span className="font-medium">{u.reruns}</span></div>
                                <div>Flaky: <span className="font-medium">{u.flaky_count}</span></div>
                                <div>Avg duration: <span className="font-medium">{formatDuration(u.avg_duration_seconds)}</span></div>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold">Current vs Previous</h4>
                              <div className="mt-2 text-sm">
                                <div className="flex items-center justify-between"><div className="text-gray-600">Total</div><div className="font-medium">{u.total_executions}<span className="text-xs text-gray-500 ml-2">({u.total_executions_prev ?? 0})</span></div></div>
                                <div className="flex items-center justify-between mt-1"><div className="text-gray-600">Passed</div><div className="font-medium">{u.passed}<span className="text-xs text-gray-500 ml-2">({u.passed_prev ?? 0})</span></div></div>
                                <div className="flex items-center justify-between mt-1"><div className="text-gray-600">Pass %</div><div className="font-medium">{u.passPercent}% <span className="text-xs text-gray-500 ml-2">({u.passPercent_prev ?? 0}%)</span></div></div>
                                <div className="flex items-center justify-between mt-1"><div className="text-gray-600">Flaky</div><div className="font-medium">{u.flaky_count}<span className="text-xs text-gray-500 ml-2">({u.flaky_count_prev ?? 0})</span></div></div>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold">Daily breakdown</h4>
                              <div className="mt-2 text-sm">
                                {seriesRows.length ? (
                                  <table className="text-sm w-full">
                                    <thead>
                                      <tr className="text-left text-xs text-gray-500">
                                        <th className="py-1">Day</th>
                                        <th className="py-1">Runs</th>
                                        <th className="py-1">Passed</th>
                                        <th className="py-1">Failed</th>
                                        <th className="py-1">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {seriesRows.map((r) => (
                                        <tr key={r.day}>
                                          <td className="py-1 text-xs">{r.day}</td>
                                          <td className="py-1 font-medium">{Number(r.total_executions ?? 0)}</td>
                                          <td className="py-1">{r.passed ?? "-"}</td>
                                          <td className="py-1">{r.failed ?? "-"}</td>
                                          <td className="py-1">
                                            <button
                                              className="text-xs px-2 py-1 border rounded"
                                              onClick={() => fetchRawExecutions(u.executed_by, r.day)}
                                            >
                                              View rows
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div className="text-xs text-gray-400">No daily data</div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* raw rows viewer */}
                          <div className="mt-4">
                            <h4 className="font-semibold">Raw executions {selectedUser ? `for ${selectedUser}` : ""}</h4>

                            {rawLoading && <div className="text-sm text-gray-500 mt-2">Loading raw executions…</div>}
                            {rawError && <div className="text-sm text-red-600 mt-2">{rawError}</div>}

                            <div className="overflow-x-auto mt-2">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="bg-white/30">
                                    <th className="p-2 text-left">execution_id</th>
                                    <th className="p-2 text-left">run_id</th>
                                    <th className="p-2 text-left">testcase_id</th>
                                    <th className="p-2 text-left">status</th>
                                    <th className="p-2 text-left">executed_at</th>
                                    <th className="p-2 text-left">updated_at</th>
                                    <th className="p-2 text-left">bug_ids</th>
                                    <th className="p-2 text-left">remarks</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(rawRows[(selectedUser || "") + ""] || []).map((r) => (
                                    <tr key={r.execution_id} className="border-t">
                                      <td className="p-2">{r.execution_id}</td>
                                      <td className="p-2">{r.run_id}</td>
                                      <td className="p-2">{r.testcase_id}</td>
                                      <td className="p-2"><span className="px-2 py-0.5 rounded text-xs bg-gray-100">{r.status}</span></td>
                                      <td className="p-2">{r.executed_at ?? "-"}</td>
                                      <td className="p-2">{r.updated_at ?? "-"}</td>
                                      <td className="p-2"><pre className="text-xs">{r.bug_ids ?? "[]"}</pre></td>
                                      <td className="p-2">{r.remarks ?? "-"}</td>
                                    </tr>
                                  ))}
                                  {/* also allow lookup by day if rawRows keyed by user:day */}
                                  {(selectedUser && rawRows[selectedUser + ":" + (dailyByUser.get(selectedUser)?.[0]?.day || "")])?.map ? null : null}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Tip: click a row to expand and see daily details; click <strong>View rows</strong> to fetch raw executions for that day.
      </div>
    </div>
  );
}
