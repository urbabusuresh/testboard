"use client";
import React,{useEffect,useState} from "react";
export default function TestCaseForm({initial={},onCancel,onSave,buildId}:{initial?:any;onCancel:any;onSave:any;buildId:any}){
  const [projectId,setProjectId]=useState(initial.projectId??""); 
  const [ts_sid,setTsSid]=useState(initial.ts_sid??""); 
  const [tc_id,setTcId]=useState(initial.tc_id??"");
   const [desc,setDesc]=useState(initial.tc_description??""); 
   const [steps,setSteps]=useState(initial.steps??""); 
   const [status,setStatus]=useState(initial.status??"");
  useEffect(()=>{ setProjectId(initial.projectId??"");
     setTsSid(initial.ts_sid??""); setTcId(initial.tc_id??"");
      setDesc(initial.tc_description??""); 
      setSteps(initial.steps??"");
       setStatus(initial.status??""); },[initial]);
  async function submit(e:React.FormEvent){ e.preventDefault(); 
    await onSave({ projectId:Number(projectId), ts_sid:ts_sid!==""?Number(ts_sid):null, tc_id:tc_id, tc_description:desc||null, steps:steps||null, status:status||null }); }
  return (
  <form onSubmit={submit} className="space-y-4">
    <div className="grid grid-cols-3 gap-3">
      <label className="block">
        <div className="text-xs">projectId</div>
      <input value={projectId as any} onChange={e=>setProjectId(e.target.value)} type="number" className="input" /></label>
      <label className="block"><div className="text-xs">ts_sid</div><input value={ts_sid as any} onChange={e=>setTsSid(e.target.value)} type="number" className="input" /></label>
      <label className="block"><div className="text-xs">tc_id</div><input required value={tc_id} onChange={e=>setTcId(e.target.value)} className="input" /></label></div>
      <label className="block"><div className="text-xs">Description</div><textarea value={desc} onChange={e=>setDesc(e.target.value)} className="textarea" rows={3} /></label>
      <label className="block"><div className="text-xs">Steps</div><textarea value={steps} onChange={e=>setSteps(e.target.value)} className="textarea" rows={3} /></label>
      <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="px-3 py-1 border rounded">Cancel</button>
      <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Save</button></div></form>); }
