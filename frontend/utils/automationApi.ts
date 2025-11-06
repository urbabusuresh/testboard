// utils/automationApi.ts

export class ApiError extends Error {
  status: number;
  body: any;

  constructor(message: string, status: number, body: any = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://localhost:8001";

async function api<T>(
  path: string,
  init?: RequestInit & { json?: any }
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: "no-store",
  });

  // parse body if possible
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  let parsedBody: any = null;
  if (contentType.includes("application/json")) {
    parsedBody = await res.json().catch(() => null);
  } else {
    parsedBody = await res.text().catch(() => null);
  }

  if (!res.ok) {
    // prefer structured messages if available
    let message = res.statusText || `HTTP ${res.status}`;
    if (parsedBody) {
      if (typeof parsedBody === "string" && parsedBody.trim()) {
        message = parsedBody;
      } else if (parsedBody.error) {
        message = parsedBody.error;
      } else if (parsedBody.message) {
        message = parsedBody.message;
      }
    }
    throw new ApiError(message, res.status, parsedBody);
  }

  // success: return parsed JSON or raw text
  if (contentType.includes("application/json")) {
    return parsedBody as T;
  } else {
    // if not JSON, return raw text (cast to any to satisfy generic)
    return (parsedBody as any) as T;
  }
}

export const automationApi = {
  // CASES
  syncModule: (moduleName: string) =>
    api<{ module: string; files: string[] }>(`/api/autotestcases/sync`, {
      method: "POST",
      json: { module: moduleName },
    }),
  listModules: () => api<{ modules: string[] }>(`/api/autotestcases/modules`),
  listCasesByModule: (m: string) =>
    api<{ cases: { ts_id: number; module: string; testfilename: string }[] }>(
      `/api/autotestcases/modules/${encodeURIComponent(m)}/cases`
    ),
  deleteCase: (id: number) => api(`/api/autotestcases/${id}`, { method: "DELETE" }),

  // GROUPS
  listGroups: () => api<{ groups: any[] }>(`/api/autotestcasegroups`),
  // upload testdata file for a testcase (multipart)
  uploadTestdata: async (ts_id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/autotestcases/${ts_id}/testdata`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new ApiError(txt || res.statusText, res.status, txt);
    }
    return res.json();
  },

  createGroup: (payload: {
    group_name: string;
    ts_ids: number[];
    testdataPath?: string | null;
    created_by?: number | null;
    status?: 0 | 1;
  }) => api(`/api/autotestcasegroups`, { method: "POST", json: payload }),
  groupCases: (id: number) =>
    api<{ cases: { ts_id: number; module: string; testfilename: string }[] }>(
      `/api/autotestcasegroups/${id}/cases`
    ),

  // RUNS
  startRun: (payload: {
    ts_buildname: string;
    ts_description?: string | null;
    ts_env?: string;
    ts_browser?: string;
    testdataPath?: string | null;
    ts_case_id?: number | null;
    test_group_id?: number | null;
  }) => api(`/api/autotestruns`, { method: "POST", json: payload }),
  scheduleRun: (payload: {
    ts_buildname: string;
    ts_schedule_time: string;
    ts_repeated?: "Y" | "N";
    ts_description?: string | null;
    ts_env?: string;
    ts_browser?: string;
    testdataPath?: string | null;
    ts_case_id?: number | null;
    test_group_id?: number | null;
  }) => api(`/api/autotestruns/schedule`, { method: "POST", json: payload }),
  listRuns: (query?: { status?: string; limit?: number }) => {
    const p = new URLSearchParams();
    if (query?.status) p.set("status", query.status);
    if (query?.limit) p.set("limit", String(query.limit));
    const qs = p.toString() ? `?${p.toString()}` : "";
    return api<{ runs: any[] }>(`/api/autotestruns${qs}`);
  },
  cancelScheduled: (id: number) => api(`/api/autotestruns/${id}/schedule`, { method: "DELETE" }),

  // inside automationApi
  generateAllureReport: (payload: { resultsDir: string; name?: string }) =>
    api<{ url: string }>(`/api/allure-report/generate`, {
      method: "POST",
      json: {
        ...payload,
        name: payload.name || `report-${Date.now()}`, // default unique name
      },
    }),
};
