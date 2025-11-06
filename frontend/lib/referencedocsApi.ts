// src/lib/referencedocsApi.ts
import { ReferenceDoc } from "@/types/referencedoc";
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "";
async function fetchJson(url:string, opts:RequestInit={}){ const res=await fetch(API_BASE+url,{headers:{"Content-Type":"application/json"},...opts}); if(!res.ok) throw new Error(await res.text()); const ct=res.headers.get('content-type')||''; return ct.includes('application/json')?res.json():res.text(); }
export async function listReferenceDocs(params:any={}){ const {q,projectId,tm_id,page=1,size=25} = params; const ps=new URLSearchParams(); if(q)ps.set('q',String(q)); if(projectId!==undefined)ps.set('projectId',String(projectId)); if(tm_id!==undefined)ps.set('tm_id',String(tm_id)); ps.set('limit',String(size)); ps.set('offset',String((page-1)*size)); return fetchJson(`/api/referencedocs?${ps.toString()}`); }
export async function getReferenceDoc(id:number){ return fetchJson(`/api/referencedocs/${id}`); }
export async function createReferenceDoc(p:any){ return fetchJson(`/api/referencedocs`,{method:'POST',body:JSON.stringify(p)}); }
export async function updateReferenceDoc(id:number,p:any){ return fetchJson(`/api/referencedocs/${id}`,{method:'PUT',body:JSON.stringify(p)}); }
export async function deleteReferenceDoc(id:number){ return fetchJson(`/api/referencedocs/${id}`,{method:'DELETE'}); }
export function exportReferenceDocsCsvUrl(opts:any={}){ const ps=new URLSearchParams(); if(opts.q)ps.set('q',String(opts.q)); if(opts.projectId)ps.set('projectId',String(opts.projectId)); if(opts.tm_id)ps.set('tm_id',String(opts.tm_id)); return API_BASE+`/api/referencedocs/export/csv?${ps.toString()}`; }
