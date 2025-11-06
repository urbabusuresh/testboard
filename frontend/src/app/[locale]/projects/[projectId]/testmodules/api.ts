// lib/api.ts
import { ModuleItem, ListMeta } from '@/types/testmodule';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || '';

async function fetchJson<T = any>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(API_BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText} - ${body}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json() as Promise<T>;
  return (await res.text()) as unknown as T;
}

export type ModulesListResponse = {
  meta: ListMeta;
  items: ModuleItem[];
};

export async function listModules(params: {
  q?: string;
  projectId?: string | number;
  status?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
} = {}): Promise<ModulesListResponse> {
  const {
    q, projectId, status, page = 1, size = 25, sortBy = 'createdAt', sortDir = 'DESC',
  } = params;
  const ps = new URLSearchParams();
  if (q) ps.set('q', String(q));
  if (projectId !== undefined && projectId !== '') ps.set('projectId', String(projectId));
  if (status) ps.set('status', status);
  ps.set('limit', String(size));
  ps.set('offset', String((page - 1) * size));
  ps.set('sortBy', sortBy);
  ps.set('sortDir', sortDir);
  const url = `/api/testmodules?${ps.toString()}`;
  return fetchJson<ModulesListResponse>(url);
}

export async function getModule(tm_id: number): Promise<ModuleItem> {
  return fetchJson<ModuleItem>(`/api/testmodules/${tm_id}`);
}

export async function createModule(payload: Partial<ModuleItem>): Promise<ModuleItem> {
  return fetchJson<ModuleItem>('/api/testmodules', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateModule(tm_id: number, payload: Partial<ModuleItem>): Promise<ModuleItem> {
  return fetchJson<ModuleItem>(`/api/testmodules/${tm_id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteModule(tm_id: number): Promise<{ success?: boolean }> {
  return fetchJson<{ success?: boolean }>(`/api/testmodules/${tm_id}`, { method: 'DELETE' });
}

export function exportModulesCsvUrl(opts: { q?: string; projectId?: string | number; status?: string } = {}) {
  const ps = new URLSearchParams();
  if (opts.q) ps.set('q', String(opts.q));
  if (opts.projectId !== undefined && opts.projectId !== '') ps.set('projectId', String(opts.projectId));
  if (opts.status) ps.set('status', opts.status);
  return API_BASE + `/api/testmodules/export/csv?${ps.toString()}`;
}
