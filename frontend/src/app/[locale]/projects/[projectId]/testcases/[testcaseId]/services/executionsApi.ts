// src/services/executionsApi.ts
import { TestCaseExecution, TestCaseExecutionUpsert } from "@/types/testcase-execution";

const BASE =
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.replace(/\/$/, "") ||
  "http://localhost:6223"; // adjust to your server
const ROOT = `${BASE}/runcases/executions`;

type ListParams = {
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  status?: string;
  cycle_number?: number | string;
  run_id?: number | string;
  testcase_id?: number | string;
  reviewed_by?: string;
  approved_by?: string;
  fromDate?: string;
  toDate?: string;
  execution_state?: string;
};

export async function listExecutions(params: ListParams = {}) {
  const qs = new URLSearchParams(params as Record<string, string>);
  const res = await fetch(`${ROOT}?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
    data: TestCaseExecution[];
  }>;
}

export async function getByExecutionId(execution_id: number) {
  const res = await fetch(`${ROOT}/${execution_id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<TestCaseExecution>;
}

export async function getByTestcaseId(testcase_id: number) {
  const res = await fetch(`${ROOT}/testcase/${testcase_id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<TestCaseExecution[]>;
}

export async function getByTestcaseAndRun(testcase_id: number, run_id: number) {
  const res = await fetch(`${ROOT}/testcase/${testcase_id}/build/${run_id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<TestCaseExecution[]>;
}

export async function upsertExecution(payload: TestCaseExecutionUpsert) {
  const res = await fetch(`${ROOT}/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateExecution(execution_id: number, partial: Partial<TestCaseExecutionUpsert>) {
  const res = await fetch(`${ROOT}/${execution_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteExecution(execution_id: number) {
  const res = await fetch(`${ROOT}/${execution_id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * Bug type (matches API response)
 */
export type Bug = {
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

export type TestcaseApiResponse = {
  requestedTestcaseIds?: number[] | string[];
  extractedBugIds?: number[];
  bugs?: Bug[];
  notFound?: number[];
  message?: string;
};

const BUG_ROOT = `${BASE}/api/bugzilla/bugs`;
const TESTCASE_ENDPOINT = `${BUG_ROOT}/testcase`;
const BATCH_ENDPOINT = `${BUG_ROOT}/batch`;

/**
 * Uniform handler for JSON responses (throws server text on error)
 */
async function handleJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch bug details for a testcase (uses your /testcase endpoint)
 * usage: const json = await getBugsByTestcase(5);
 */
export async function getBugsByTestcase(testcaseId: number | string) {
  const url = `${TESTCASE_ENDPOINT}?testcaseIds=${encodeURIComponent(String(testcaseId))}`;
  const res = await fetch(url, { cache: "no-store" });
  return handleJsonResponse<TestcaseApiResponse>(res);
}

/**
 * Fetch bugs by comma-separated ids or number array (uses /batch)
 * usage: const { bugs } = await getBugsBatch([420,502,32]);
 */
export async function getBugsBatch(ids: number[] | string) {
  const idParam = Array.isArray(ids) ? ids.join(",") : String(ids);
  const url = `${BATCH_ENDPOINT}?ids=${encodeURIComponent(idParam)}`;
  const res = await fetch(url, { cache: "no-store" });
  return handleJsonResponse<{ requestedIds?: number[]; bugs?: Bug[] }>(res);
}

/**
 * Check if a bug exists (uses /:bugId/exists)
 * usage: const exists = await bugExists(123);
 */
export async function bugExists(bugId: number) {
  const url = `${BUG_ROOT}/${bugId}/exists`;
  const res = await fetch(url, { cache: "no-store" });
  return handleJsonResponse<{ exists?: boolean }>(res).then((j) => !!j.exists);
}