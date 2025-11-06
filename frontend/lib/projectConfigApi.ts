// src/lib/projectConfigApi.ts
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

export const projectConfigApi = {
  // List / search configs
  listConfigs: async (params: Record<string, any>) => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return fetchJson(`/api/projectconfig?${query}`);
  },

  // Get single config by ID
  getConfig: async (id: number) => {
    return fetchJson(`/api/projectconfig/${id}`);
  },

  // Create new config
  createConfig: async (data: Record<string, any>) => {
    return fetchJson(`/api/projectconfig`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Patch / update config partially
  patchConfig: async (id: number, data: Record<string, any>) => {
    return fetchJson(`/api/projectconfig/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Soft delete config
  deleteConfig: async (id: number) => {
    return fetchJson(`/api/projectconfig/${id}`, { method: 'DELETE' });
  },

  // Effective config lookup
  getEffectiveConfig: async (params: Record<string, any>) => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return fetchJson(`/api/projectconfig/effective?${query}`);
  },

  // Resolved testpath
  getResolvedTestpath: async (params: Record<string, any>) => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return fetchJson(`/api/projectconfig/resolved-testpath?${query}`);
  },
};

export default projectConfigApi;
