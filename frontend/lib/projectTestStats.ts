const API_BASE = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "";

async function fetchJson<T = any>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(API_BASE + url, {
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    ...opts,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : (res.text() as any);
}

/**
 * Get project test stats from backend
 */
export async function getProjectTestStats(projectId: number) {
  return fetchJson<{ success: boolean; data: any }>(
    `/api/kpis/getProjectTestStats?projectId=${projectId}`
  );
}

export default fetchJson;
