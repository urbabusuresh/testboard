"use client";
import React,{useEffect,useState} from "react";
import { listReferenceDocs, getReferenceDoc, createReferenceDoc, updateReferenceDoc, deleteReferenceDoc, exportReferenceDocsCsvUrl } from "@/lib/referencedocsApi";
import ReferenceDocTable from "./ReferenceDocTable";
import ReferenceDocForm from "./ReferenceDocForm";
import ReferenceDocDrawer from "./ReferenceDocDrawer";

export default function ReferenceDocsClient({ projectIdProp, tmIdProp }: { projectIdProp?: number|string; tmIdProp?: number|string }) {
  const [q,setQ]=useState(""); 
  //const [projectId,setProjectId]=useState<number|string|">(projectIdProp??""); 
  const [projectId, setProjectId] = useState<number|string>(projectIdProp ?? "");
  const [tmId,setTmId]=useState<number|string>(tmIdProp??"");
  const [page,setPage]=useState(1); const [size]=useState(25);
  const [items,setItems]=useState<any[]>([]); const [meta,setMeta]=useState<{total:number}>({total:0});
  const [loading,setLoading]=useState(false); const [selected,setSelected]=useState<any|null>(null); const [editing,setEditing]=useState<any|null>(null); const [showForm,setShowForm]=useState(false); const [error,setError]=useState<string|undefined>();
  async function load(){ setLoading(true); setError(undefined); try{ const res:any=await listReferenceDocs({q,projectId,tm_id:tmId,page,size}); setItems(res.items||[]); setMeta(res.meta||{total:0}); }catch(e:any){ setError(String(e?.message||e)); }finally{ setLoading(false);} }
  useEffect(()=>{ load(); },[q,projectId,tmId,page]);

  async function handleView(it:any){ try{ const d=await getReferenceDoc(it.rd_id); setSelected(d);}catch(e:any){ alert(String(e)); } }
  function handleClose(){ setSelected(null); }
  function handleNew(){ setEditing(null); setShowForm(true); }
  function handleEdit(it:any){ setEditing(it); setShowForm(true); }
  async function handleDelete(it:any){ if(!confirm('Delete?'))return; await deleteReferenceDoc(it.rd_id); load(); }
  async function handleSave(p:any){ try{ if(editing&&editing.rd_id) await updateReferenceDoc(editing.rd_id,p); else await createReferenceDoc(p); setShowForm(false); load(); }catch(e:any){ alert(String(e)); } }

  const totalPages=Math.max(1,Math.ceil((meta.total||0)/size));
  return (<div className="p-4">
    <div className="mb-4 flex gap-3 items-center">
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="search" className="input" /><input value={projectId as string} onChange={e=>setProjectId(e.target.value)} placeholder="projectId" type="number" className="input w-28" />
      <input value={tmId as string} onChange={e=>setTmId(e.target.value)} placeholder="tm_id" type="number" className="input w-24" /><button onClick={()=>{ setPage(1); load(); }} className="px-3 py-1 rounded bg-blue-600 text-white">Search</button><div className="ml-auto flex gap-2">
        <a href={exportReferenceDocsCsvUrl({q,projectId,tm_id:tmId})} className="px-3 py-1 rounded bg-gray-100">Export</a><button onClick={handleNew} className="px-3 py-1 rounded bg-green-600 text-white">New</button></div></div>
    <div className="mb-2 text-sm text-gray-600">Total: {meta.total||0} — Page {page} / {totalPages}</div>
    {loading? <div className="p-4">Loading…</div> : error? <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div> : <ReferenceDocTable items={items} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} />}
    <div className="mt-4 flex gap-2"><button onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-2 py-1 border rounded">Prev</button><div className="text-sm">Page {page} / {totalPages}</div><button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-2 py-1 border rounded">Next</button></div>
    {selected? <ReferenceDocDrawer doc={selected} onClose={handleClose} />:null}
    {showForm? <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black opacity-30" onClick={()=>{ setShowForm(false); setEditing(null); }} /><div className="bg-white p-6 rounded shadow-md w-[760px] z-50"><h2 className="text-lg font-semibold mb-4">{editing? 'Edit':'Create'}</h2><ReferenceDocForm initial={editing??undefined} onCancel={()=>{ setShowForm(false); setEditing(null); }} onSave={handleSave} /></div></div>:null}
  </div>);
}
