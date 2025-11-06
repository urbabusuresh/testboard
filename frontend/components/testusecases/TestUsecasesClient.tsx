"use client";
import React, { useEffect, useState } from "react";
import { TestUseCase } from "@/types/testusecase";
import { 
  listTestUseCases, getTestUseCase, createTestUseCase, updateTestUseCase, deleteTestUseCase, exportTestUseCasesCsvUrl 
} from "@/lib/testusecasesApi";
import TestUseCaseTable from "./TestUseCaseTable";
import TestUseCaseDrawer from "./TestUseCaseDrawer";
import TestUseCaseForm from "./TestUseCaseForm";
import TestScenarioForm from "../testscenarios/TestScenarioForm"; // Import your scenario form
import { useRouter } from "next/navigation";
import { Divider } from "@heroui/react";
import { createTestScenario } from "@/lib/testscenariosApi"; // API call for scenarios

export default function TestUsecasesClient({ projectIdProp, tmIdProp, moduleId }:{
  projectIdProp?: number|string; 
  tmIdProp?: number|string; 
  moduleId?: number|string
}) {

  const router = useRouter();
  const [q,setQ] = useState(""); 
  const [projectId,setProjectId] = useState<number|string>(projectIdProp ?? "");
  const [tmId,setTmId] = useState<number|string>(moduleId ?? ""); 
  const [status,setStatus] = useState("");
  const [page,setPage] = useState(1); 
  const [size] = useState(25);
  const [items,setItems] = useState<TestUseCase[]>([]); 
  const [meta,setMeta] = useState<{total:number}>({total:0});
  const [loading,setLoading] = useState(false); 
  const [selected,setSelected] = useState<TestUseCase|null>(null);
  const [editing,setEditing] = useState<TestUseCase|null>(null); 
  const [showForm,setShowForm] = useState(false); 
  const [error,setError] = useState<string|undefined>();

  // --- Scenario creation state ---
  const [editingScenario,setEditingScenario] = useState<any|null>(null);
  const [showScenarioForm,setShowScenarioForm] = useState(false);

  async function load(){ 
    setLoading(true); setError(undefined); 
    try{ 
      const res:any = await listTestUseCases({ q, projectId, tm_id: tmId, status, page, size }); 
      setItems(res.items||[]); 
      setMeta(res.meta||{total:0}); 
    }catch(e:any){ setError(String(e?.message||e)); }finally{ setLoading(false);} 
  }

  useEffect(()=>{ load(); },[q,projectId,tmId,status,page]);

  async function handleView(item: TestUseCase){ 
    try{ 
      const full=await getTestUseCase(item.uc_sid); 
      setSelected(full);
    }catch(e:any){ alert("Error: "+(e?.message||e)); } 
  }
  function handleCloseDrawer(){ setSelected(null); }
  function handleNew(){ setEditing(null); setShowForm(true); }
  function handleEdit(item: TestUseCase){ setEditing(item); setShowForm(true); }
  async function handleDelete(item: TestUseCase){ 
    if(!confirm(`Delete ${item.uc_id}?`))return; 
    await deleteTestUseCase(item.uc_sid); 
    load(); 
  }

  async function handleSave(payload:any){ 
    try{ 
      if(editing && editing.uc_sid)
        { 
         
          await updateTestUseCase(editing.uc_sid, payload);
        
        } 
      else { await createTestUseCase(payload); } 
      setShowForm(false); setEditing(null); load(); 
    }catch(e:any){ alert("Save failed: "+(e?.message||e)); } 
  }
 async function handleSaveEdit(uc_sid:any,payload:any){ 
    try{ 
     
         
          await updateTestUseCase(uc_sid, payload);
        
    
      setShowForm(false); setEditing(null); load(); 
    }catch(e:any){ alert("Save failed: "+(e?.message||e)); } 
  }
  async function handleSaveScenario(payload:any){
    try {
      await createTestScenario(payload);
      setShowScenarioForm(false);
      setEditingScenario(null);
      load();
      alert("Test Scenario created successfully!");
    } catch(err:any) {
      alert("Scenario creation failed: " + (err?.message || err));
    }
  }

  function viewTestScenarios(uc: any) {
   
    const uc_id = uc.uc_id ?? uc.uc_id;
    router.push(`/en/projects/${projectId}/testscenarios?uc=${uc_id}`);
  }

  const totalPages=Math.max(1, Math.ceil((meta.total||0)/size));

  return (
    <div className="p-1">
      <div className="mb-4 flex gap-3 items-center">
        <button onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-2 py-1 border rounded">&#60;Prev</button>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="search usecases" className="input border p-1 rounded w-60" />
        {/* <select value={status} onChange={e=>setStatus(e.target.value)} className="input w-36 p-1 rounded">
          <option value="">All</option>
          <option value="ACTIVE">ACTIVE</option>
        </select> */}
        <button onClick={()=>{ setPage(1); load(); }} className="px-3 py-1 rounded bg-blue-600 text-white">Search</button>
        <div className="ml-auto flex gap-2">
          <a href={exportTestUseCasesCsvUrl({q,projectId,tm_id:tmId,status})} className="px-3 py-1 rounded bg-gray-100">Export CSV</a>
          <button onClick={handleNew} className="px-3 py-1 rounded bg-green-600 text-white">New</button>
        </div>
        <div className="mb-2 text-sm text-gray-600">Total: {meta.total||0} <br/> Page {page} / {totalPages}</div>
        <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-2 py-1 border rounded">Next&#62;</button>
      </div>

      <Divider/>
      {loading ? <div className="p-2 bg-white rounded shadow text-center">Loading…</div> : error ? 
        <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div> :
        <TestUseCaseTable 
          items={items} 
          viewTestScenarios={viewTestScenarios} 
          onView={handleView} 
          onEdit={handleEdit} 
          onDelete={handleDelete}
          onCreateScenario={(uc) => {
            setEditingScenario({
              projectId: uc.projectId,
              uc_sid: uc.uc_sid,
              uc_id: uc.uc_id,
            });
            setShowScenarioForm(true);
          }}
        />
      }

      <div className="mt-4 flex items-center gap-2">
        <button onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-2 py-1 border rounded">Prev</button>
        <div className="text-sm">Page {page} / {totalPages}</div>
        <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-2 py-1 border rounded">Next</button>
      </div>

      {selected && <TestUseCaseDrawer usecase={selected} onClose={handleCloseDrawer}  onUpdate={handleSaveEdit} />}

      {/* UseCase Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={()=>{ setShowForm(false); setEditing(null); }} />
          <div className="bg-white p-6 rounded shadow-md w-[760px] z-50">
            <h2 className="text-lg font-semibold mb-4">{editing ? `Edit: ${editing.uc_id}` : "Create"}</h2>
            <TestUseCaseForm 
              initial={editing ?? undefined} 
              projectIdval={projectId} 
              onCancel={()=>{ setShowForm(false); setEditing(null); }} 
              onSave={handleSave} 
            />
          </div>
        </div>
      )}

      {/* Scenario Form */}
      {showScenarioForm && editingScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={()=>{ setShowScenarioForm(false); setEditingScenario(null); }} />
          <div className="bg-white p-6 rounded shadow-md w-[760px] z-50">
            <h2 className="text-lg font-semibold mb-4">Create Test Scenario for {editingScenario.uc_id}</h2>
            <TestScenarioForm 
              initial={editingScenario} 
              onCancel={()=>{ setShowScenarioForm(false); setEditingScenario(null); }} 
              onSave={handleSaveScenario} 
            />
          </div>
        </div>
      )}

    </div>
  );
}
