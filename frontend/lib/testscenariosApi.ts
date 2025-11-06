// src/lib/testscenariosApi.ts
import { TestScenario } from "@/types/testscenario";
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "";
async function fetchJson(url:string, opts:RequestInit={}){ const res=await fetch(API_BASE+url,{headers:{"Content-Type":"application/json"},...opts}); if(!res.ok) throw new Error(await res.text()); const ct=res.headers.get('content-type')||''; return ct.includes('application/json')?res.json():res.text(); }
export async function listTestScenarios(params:any={})
{
const {q,projectId,uc_sid,module,useCaseCode,ts_type,page=1,size=25} = params; const ps=new URLSearchParams(); 
if(q)ps.set('q',String(q)); 
if(projectId!==undefined)ps.set('projectId',String(projectId)); 
if(uc_sid!==undefined)ps.set('uc_sid',String(uc_sid)); 
if(useCaseCode!==undefined && useCaseCode!=="all")ps.set('uc_id',String(useCaseCode)); 
if(module!==undefined && module!=="all")ps.set('module',String(module));
if(ts_type)ps.set('ts_type',String(ts_type)); 


ps.set('limit',String(size)); ps.set('offset',String((page-1)*size)); 
return fetchJson(`/api/testscenarios?${ps.toString()}`);
 }


export async function getTestScenario(id:number){ return fetchJson(`/api/testscenarios/${id}`); }
export async function createTestScenario(p:any){ return fetchJson(`/api/testscenarios`,{method:'POST',body:JSON.stringify(p)}); }
export async function updateTestScenario(id:number,p:any){ return fetchJson(`/api/testscenarios/${id}`,{method:'PUT',body:JSON.stringify(p)}); }
export async function deleteTestScenario(id:number){ return fetchJson(`/api/testscenarios/${id}`,{method:'DELETE'}); }
export function exportTestScenariosCsvUrl(opts:any={}){ const ps=new URLSearchParams(); if(opts.q)ps.set('q',String(opts.q)); if(opts.projectId)ps.set('projectId',String(opts.projectId)); if(opts.uc_sid)ps.set('uc_sid',String(opts.uc_sid)); return API_BASE+`/api/testscenarios/export/csv?${ps.toString()}`;}
