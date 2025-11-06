// src/lib/testcasesApi.ts
import { TestCase } from "@/types/testcase";
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "";
async function fetchJson(url:string, opts:RequestInit={}){ const res=await fetch(API_BASE+url,{headers:{"Content-Type":"application/json"},...opts}); if(!res.ok) throw new Error(await res.text()); const ct=res.headers.get('content-type')||''; return ct.includes('application/json')?res.json():res.text(); }
export async function listTestCases(params: any = {}) { 
  const { q, tsCodeProp, projectId, ts_sid, page = 1, size = 25, module,buildId ,spoc} = params; 

  const ps = new URLSearchParams(); 
  
  if (q) ps.set("q", String(q)); 
  if (projectId !== undefined) ps.set("projectId", String(projectId)); 
  if (ts_sid !== undefined) ps.set("ts_sid", String(ts_sid)); 
  
  if(spoc !== undefined &&spoc!==''){
  
    ps.set("spoc", String(spoc));
  }
  ps.set("limit", String(size)); 
  ps.set("offset", String((page - 1) * size)); 

  if (
    tsCodeProp !== undefined &&
    tsCodeProp !== null &&
    tsCodeProp !== "" &&
    tsCodeProp !== "all" &&
    tsCodeProp !== "null"
  ) {
    ps.set("ts_id", String(tsCodeProp));
  }

  // ✅ Added module filter
  if (module !== undefined && module !== null && module !== "" && module !== "all") {
    ps.set("module", String(module));
  }
  if(buildId !== undefined && buildId !== null && buildId !== "" && buildId !== "all"){
    ps.set("buildId", String(buildId));
  }

  return fetchJson(`/api/testcases?${ps.toString()}`);
}


export async function getTestCase(id:number){ return fetchJson(`/api/testcases/${id}`); }
export async function createTestCase(p:any){ return fetchJson(`/api/testcases`,{method:'POST',body:JSON.stringify(p)}); }
export async function updateTestCase(id:number,p:any){ return fetchJson(`/api/testcases/${id}`,{method:'PUT',body:JSON.stringify(p)}); }
export async function deleteTestCase(id:number){ return fetchJson(`/api/testcases/${id}`,{method:'DELETE'}); }
export function exportTestCasesCsvUrl(opts:any={}){ const ps=new URLSearchParams(); if(opts.q)ps.set('q',String(opts.q)); if(opts.projectId)ps.set('projectId',String(opts.projectId)); if(opts.ts_sid)ps.set('ts_sid',String(opts.ts_sid)); return API_BASE+`/api/testcases/export/csv?${ps.toString()}`; }


