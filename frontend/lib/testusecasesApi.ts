// src/lib/testusecasesApi.ts
import { TestUseCase, ListMeta } from "@/types/testusecase";
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "";
async function fetchJson(url: string, opts: RequestInit = {}) {
  const res = await fetch(API_BASE + url, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}
export type TestUseCasesListResponse = { meta: ListMeta; items: TestUseCase[]; };
export async function listTestUseCases(params: any = {}) {
  const { q, projectId, tm_id, status, page=1, size=25, sortBy="updatedAt", sortDir="DESC" } = params;
  const ps = new URLSearchParams();
  if (q) ps.set("q", String(q));
  if (projectId !== undefined) ps.set("projectId", String(projectId));
  if (tm_id !== undefined) ps.set("tm_id", String(tm_id));
  if (status) ps.set("status", String(status));
  ps.set("limit", String(size)); ps.set("offset", String((page-1)*size));
  ps.set("sortBy", sortBy); ps.set("sortDir", sortDir);
  return fetchJson(`/api/testusecases?${ps.toString()}`);
}
export async function getTestUseCase(uc_sid: number) { return fetchJson(`/api/testusecases/${uc_sid}`); }
export async function createTestUseCase(payload: any) { return fetchJson(`/api/testusecases`, { method: "POST", body: JSON.stringify(payload) }); }
export async function updateTestUseCase(uc_sid: number, payload: any) { return fetchJson(`/api/testusecases/${uc_sid}`, { method: "PUT", body: JSON.stringify(payload) }); }
export async function deleteTestUseCase(uc_sid: number) { return fetchJson(`/api/testusecases/${uc_sid}`, { method: "DELETE" }); }
export function exportTestUseCasesCsvUrl(opts: any = {}) { const ps=new URLSearchParams(); if(opts.q)ps.set('q',String(opts.q)); if(opts.projectId)ps.set('projectId',String(opts.projectId)); if(opts.tm_id)ps.set('tm_id',String(opts.tm_id)); if(opts.status)ps.set('status',String(opts.status)); return API_BASE + `/api/testusecases/export/csv?${ps.toString()}`; }
