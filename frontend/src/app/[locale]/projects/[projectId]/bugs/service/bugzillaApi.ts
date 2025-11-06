export const API_BASE =process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://localhost:8001";

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
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}
// api.ts (or wherever automationApi is defined)
export const bugzillaApi = {
  // ...existing automationApi methods

  // BUGZILLA
  listBugs: (query?: {
    page?: number;
    limit?: number;
    priority?: string;
    severity?: string;
    status?: string;
    reporter?: string;
    assignedTo?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    greaterThanDate?: string;
  }) => {
    const p = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          p.set(k, String(v));
        }
      });
    }
    const qs = p.toString() ? `?${p.toString()}` : "";
    return api<{
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
      bugs: any[];
    }>(`/api/bugzilla/bugs${qs}`);
  },

  listBugsByRunID: (query?: {
    page?: number;
    limit?: number;
    priority?: string;
    severity?: string;
    status?: string;
    reporter?: string;
    assignedTo?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    greaterThanDate?: string;
    runId?: string;
  }) => {
    const p = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          p.set(k, String(v));
        }
      });
    }
    const qs = p.toString() ? `?${p.toString()}` : "";
    return api<{
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
      bugs: any[];
    }>(`/api/bugzilla/bugs/testcaseByRunId${qs}`);
  },

  downloadBugsExcel: async (query?: {
    priority?: string;
    severity?: string;
    status?: string;
    reporter?: string;
    assignedTo?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    greaterThanDate?: string;
  }) => {
    const p = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          p.set(k, String(v));
        }
      });
    }
    p.set("download", "excel");

    const res = await fetch(`${API_BASE}/api/bugzilla/bugs?${p.toString()}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },

  sendBugsReportMail: (query: {
    email: string;
    priority?: string;
    severity?: string;
    status?: string;
    reporter?: string;
    assignedTo?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    greaterThanDate?: string;
  }) => {
    const p = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        p.set(k, String(v));
      }
    });
    p.set("sendMail", query.email);

    return api<{ message: string }>(`/api/bugzilla/bugs?${p.toString()}`);
  },

 // ---- CHECK BUG EXISTS (FIXED PATH) ----
  checkBugExists: async (bugId: string): Promise<boolean> => {
    const data = await api<{ exists: boolean }>(
      `/api/bugzilla/bugs/${encodeURIComponent(bugId)}/exists`
    );
    return Boolean(data?.exists);
  },

};
