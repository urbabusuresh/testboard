// file: app/bug-history/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from "react";
import { getBugsByTestcase } from "../services/executionsApi";

/** Types that match your API response */
type Bug = {
  bug_id: number;
  priority: string;
  bug_severity: string;
  bug_status: string;
  creation_ts: string | null;
  delta_ts: string | null;
  resolution: string | null;
  lastdiffed: string | null;
  short_desc: string | null;
  comments: string | null;
  comments_noprivate: string | null;
  assigned_userid?: number | null;
  assigned_to_name?: string | null;
  assigned_to_realname?: string | null;
  reporter_userid?: number | null;
  reporter_name?: string | null;
  reporter_realname?: string | null;
  days_to_resolve?: number | null;
};

type TestcaseApiResponse = {
  requestedTestcaseIds?: number[] | string[];
  extractedBugIds?: number[];
  bugs?: Bug[];
  notFound?: number[];
  message?: string;
};

export default function BugHistoryPage({ caseId }: { caseId: string }) {
  // data + ui state
  const [extractedIds, setExtractedIds] = useState<number[]>([]);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);

  // filters + pagination
  const [search, setSearch] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [assignedFilter, setAssignedFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  // configure bugzilla base url via env; fallback to example
const BUGZILLA_BASE = process.env.NEXT_PUBLIC_BUGZILLA_BASE || "http://172.16.111.83:8300/bugzilla";

  // fetch function (uses existing service)
  const fetchBugsForCase = async (testcaseId: string) => {
    if (!testcaseId) {
      setError("No testcase id provided");
      setBugs([]);
      setExtractedIds([]);
      return;
    }

    setLoading(true);
    setError(null);
    setBugs([]);
    setExtractedIds([]);

    try {
      const json = (await getBugsByTestcase(testcaseId)) as TestcaseApiResponse;
      setExtractedIds(Array.isArray(json.extractedBugIds) ? json.extractedBugIds : []);
      setBugs(Array.isArray(json.bugs) ? json.bugs : []);
      if (json.message) console.info("server message:", json.message);
    } catch (err: any) {
      console.error("fetchBugsForCase error:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
      setPage(1); // reset pagination on new fetch
    }
  };

  useEffect(() => {
    if (caseId) fetchBugsForCase(caseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // derived filter lists (for selects)
  const severityOptions = useMemo(() => {
    const setS = new Set<string>();
    bugs.forEach((b) => b.bug_severity && setS.add(b.bug_severity));
    return Array.from(setS).sort();
  }, [bugs]);

  const statusOptions = useMemo(() => {
    const setS = new Set<string>();
    bugs.forEach((b) => b.bug_status && setS.add(b.bug_status));
    return Array.from(setS).sort();
  }, [bugs]);

  const assignedOptions = useMemo(() => {
    const setS = new Set<string>();
    bugs.forEach((b) => {
      const name = b.assigned_to_realname || b.assigned_to_name;
      if (name) setS.add(name);
    });
    return Array.from(setS).sort();
  }, [bugs]);

  // filtering + searching (client-side)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bugs.filter((b) => {
      if (severityFilter && b.bug_severity !== severityFilter) return false;
      if (statusFilter && b.bug_status !== statusFilter) return false;
      if (assignedFilter) {
        const ass = (b.assigned_to_realname || b.assigned_to_name || "").toLowerCase();
        if (!ass.includes(assignedFilter.toLowerCase())) return false;
      }
      if (!q) return true;
      // search in summary + comments
      const joined = `${b.short_desc || ""} ${b.comments || ""} ${b.comments_noprivate || ""}`.toLowerCase();
      return joined.includes(q) || String(b.bug_id).includes(q);
    });
  }, [bugs, search, severityFilter, statusFilter, assignedFilter]);

  // pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // helpers
  function formatDate(iso?: string | null) {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function statusColor(status?: string | null) {
    if (!status) return "#6b7280";
    const s = status.toUpperCase();
    if (s.includes("RESOLVED") || s.includes("CLOSED")) return "#10b981";
    if (s.includes("VERIF")) return "#f59e0b";
    if (s.includes("REJECT") || s.includes("REOPEN")) return "#ef4444";
    if (s.includes("CONFIRMED")) return "#3b82f6";
    return "#6b7280";
  }

  function exportCsv(rows: Bug[]) {
    const headers = ["bug_id", "status", "severity", "priority", "summary", "assigned_to", "reporter", "created", "days_to_resolve"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.bug_id,
          `"${(r.bug_status || "").replace(/"/g, '""')}"`,
          `"${(r.bug_severity || "").replace(/"/g, '""')}"`,
          `"${(r.priority || "").replace(/"/g, '""')}"`,
          `"${(r.short_desc || "").replace(/"/g, '""')}"`,
          `"${(r.assigned_to_realname || r.assigned_to_name || "").replace(/"/g, '""')}"`,
          `"${(r.reporter_realname || r.reporter_name || "").replace(/"/g, '""')}"`,
          `"${(r.creation_ts || "").replace(/"/g, '""')}"`,
          `${r.days_to_resolve ?? ""}`
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bugs_testcase_${caseId || "unknown"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Bug History</h1>
          <p className="text-sm text-gray-500">Testcase: <span className="font-medium">{caseId || "-"}</span></p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchBugsForCase(caseId)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:brightness-95 disabled:opacity-60"
            disabled={loading || !caseId}
          >
            Refresh
          </button>

          <button
            onClick={() => exportCsv(filtered)}
            className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
            disabled={filtered.length === 0}
            title="Export filtered bugs to CSV"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* filters row */}
      <div className="bg-white p-2 rounded-lg shadow-sm mb-4 grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="search id, summary or comments..."
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="w-full border rounded px-2 py-2"
          >
            <option value="">All</option>
            {severityOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full border rounded px-2 py-2"
          >
            <option value="">All</option>
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Assigned to</label>
          <select
            value={assignedFilter}
            onChange={(e) => { setAssignedFilter(e.target.value); setPage(1); }}
            className="w-full border rounded px-2 py-2"
          >
            <option value="">All</option>
            {assignedOptions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

      </div>

      {/* summary */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          <span className="mr-4"><b>Total:</b> {bugs.length}</span>
          <span className="mr-4"><b>Filtered:</b> {total}</span>
          <span className="mr-4"><b>Showing:</b> {(page-1)*pageSize + 1} - {Math.min(page*pageSize, total)}</span>
        </div>
        <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
      </div>
{/* list */}
<div className="space-y-3">
  {paginated.map((b) => (
    <div
      key={b.bug_id}
      role="button"
      tabIndex={0}
      onClick={() => setSelectedBug(b)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSelectedBug(b);
        }
      }}
      className="bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
      aria-label={`Open bug ${b.bug_id} details`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded text-white"
              style={{ background: statusColor("bug") }}
            >
              ID# {b.bug_id}
            </div>
            <div
              className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded text-white"
              style={{ background: statusColor(b.bug_status) }}
            >
              {b.bug_status}
            </div>
            <div className="text-sm text-gray-600">• {b.bug_severity}</div>
            <div className="text-sm text-gray-500 ml-2">({b.priority})</div>
          </div>

          <div className="mt-2 text-gray-800 font-medium truncate">{b.short_desc}</div>

          <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
            <div><b>Created:</b> {formatDate(b.creation_ts)}</div>
            <div><b>Updated:</b> {formatDate(b.delta_ts)}</div>
            <div><b>Assigned:</b> {b.assigned_to_realname || b.assigned_to_name || "-"}</div>
            <div><b>Reporter:</b> {b.reporter_realname || b.reporter_name || "-"}</div>
            <div><b>Days:</b> {b.days_to_resolve ?? "-"}</div>
          </div>
        </div>

      </div>
    </div>
  ))}

  {/* empty state */}
  {paginated.length === 0 && !loading && (
    <div className="bg-white rounded-lg p-6 text-center text-gray-600 shadow-sm">
      No bugs to show for current filters.
    </div>
  )}
</div>


      {/* pagination controls */}
      <div className="mt-6 flex items-center justify-between">
        
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Page size</label>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="w-full border rounded px-2 py-2"
          >
            {[5,10,20,50,100].map((n)=> <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            « First
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            ‹ Prev
          </button>

          {/* page numbers (condensed if many) */}
          <div className="px-2">
            {Array.from({ length: totalPages }).map((_, i) => {
              const pNum = i + 1;
              // show only nearby pages for large page count
              if (totalPages > 10 && Math.abs(pNum - page) > 3 && pNum !== 1 && pNum !== totalPages) return null;
              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={`mx-1 px-2 py-1 rounded ${pNum === page ? "bg-blue-600 text-white" : "border"}`}
                >
                  {pNum}
                </button>
              );
            })}
            {totalPages > 10 && page < totalPages - 4 && <span className="mx-1">…</span>}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            Next ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            Last »
          </button>
        </div>

        <div className="text-sm text-gray-500">
          Showing {Math.min(total, (page - 1) * pageSize + 1)}–{Math.min(total, page * pageSize)} of {total} filtered
        </div>
      </div>

      {/* modal */}
      {selectedBug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setSelectedBug(null)} />
          <div className="relative bg-white max-w-3xl w-full rounded shadow-lg p-6 z-10 overflow-auto max-h-[85vh]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Bug #{selectedBug.bug_id} — {selectedBug.short_desc}</h2>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="mr-3"><b>Status:</b> {selectedBug.bug_status}</span>
                  <span className="mr-3"><b>Severity:</b> {selectedBug.bug_severity}</span>
                  <span className="mr-3"><b>Priority:</b> {selectedBug.priority}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setSelectedBug(null)} className="px-3 py-1 border rounded">Close</button>
              </div>
            </div>

            <hr className="my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600"><b>Assigned to:</b> {selectedBug.assigned_to_realname || selectedBug.assigned_to_name || "-"}</div>
                <div className="text-sm text-gray-600"><b>Reporter:</b> {selectedBug.reporter_realname || selectedBug.reporter_name || "-"}</div>
                <div className="text-sm text-gray-600"><b>Created:</b> {formatDate(selectedBug.creation_ts)}</div>
                <div className="text-sm text-gray-600"><b>Updated:</b> {formatDate(selectedBug.delta_ts)}</div>
                <div className="text-sm text-gray-600"><b>Resolution:</b> {selectedBug.resolution || "-"}</div>
                <div className="text-sm text-gray-600"><b>Days to resolve:</b> {selectedBug.days_to_resolve ?? "-"}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600"><b>Last diffed:</b> {formatDate(selectedBug.lastdiffed)}</div>
                <div className="text-sm text-gray-600"><b>Bug link:</b> <a className="text-blue-600" href={`${BUGZILLA_BASE}/show_bug.cgi?id=${selectedBug.bug_id}`} target="_blank" rel="noreferrer">Open in Bugzilla</a></div>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-medium">Comments</h3>
              <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded text-sm text-gray-800">{selectedBug.comments_noprivate || selectedBug.comments || "-"}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
