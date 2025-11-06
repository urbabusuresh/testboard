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

export const automationApi = {
  // CASES
  syncModule: (moduleName: string,projectIdProp:any) =>
    api<{ module: string; files: string[] }>(`/api/autotestcases/sync`, {
      method: "POST",
      json: { module: moduleName ,projectId:projectIdProp},
    }),
  listModules: (projectIdProp: string) => api<{ modules: string[] }>(`/api/autotestcases/project/${encodeURIComponent(projectIdProp)}/modules`),
  listCasesByModule: (m: string,projectId:any) =>
    api<{ cases: { ts_id: number; module: string; testfilename: string ;description?: string ;testname:string;autc_id:string}[] }>(
      `/api/autotestcases/project/${encodeURIComponent(projectId)}/modules/${encodeURIComponent(m)}/cases`
    ),
     listCasesByModuleByCaseId: (m: string,projectId:any,caseId:any) =>
    api<{ cases: { ts_id: number; module: string; testfilename: string ;description?: string ;testname:string;autc_id:string}[] }>(
      `/api/autotestcases/project/${encodeURIComponent(projectId)}/modules/${encodeURIComponent(m)}/testcaseid/${encodeURIComponent(caseId)}`
    ),
     listCasesByModuleByRunId: (m: string,projectId:any,runId:string) =>
    api<{ cases: { ts_id: number; module: string; testfilename: string ;description?: string ;testname:string;autc_id:string}[] }>(
      `/api/autotestcases/project/${encodeURIComponent(projectId)}/modules/${encodeURIComponent(m)}/casesByRunId/${encodeURIComponent(runId)}`
    ),
  deleteCase: (id: number) =>
    api(`/api/autotestcases/${id}`, { method: "DELETE" }),

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
    if (!res.ok) throw new Error(await res.text());
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
    runId?: string | null;
    projectid?: string | null;
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
    runId?: string | null;
    projectid?: string | null;
  }) => api(`/api/autotestruns/schedule`, { method: "POST", json: payload }),
  listRuns: (query?: { status?: string; limit?: number; projectid?: string; runId?: string;queryType?: string;caseId?:string}) => {
    const p = new URLSearchParams();
    if (query?.status) p.set("status", query.status);
    if (query?.limit) p.set("limit", String(query.limit));
    if (query?.projectid) p.set("projectid", query.projectid);
    if (query?.runId) p.set("runId", query.runId);
    if(query?.queryType) p.set("queryType", query.queryType);
    if(query?.caseId) p.set("caseId", query.caseId);

    const qs = p.toString() ? `?${p.toString()}` : "";
    return api<{ runs: any[] }>(`/api/autotestruns${qs}`);
  },
  cancelScheduled: (id: number) =>
    api(`/api/autotestruns/${id}/schedule`, { method: "DELETE" }),


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
