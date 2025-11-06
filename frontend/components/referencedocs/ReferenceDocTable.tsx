"use client";
import React from "react";
export default function ReferenceDocTable({items,onView,onEdit,onDelete}:{items:any[];onView:any;onEdit:any;onDelete:any;}){
  return (<div className="overflow-x-auto bg-white rounded shadow-sm">
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50"><tr><th>Id</th><th>Doc Name</th><th>Module</th>
      <th>Status</th><th>Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{items.length===0? <tr><td colSpan={5} className="p-6 text-center text-gray-500">No docs</td></tr>: items.map(it=> (<tr key={it.rd_id}><td className="px-3 py-2">{it.rd_id}</td><td className="px-3 py-2"><button onClick={()=>onView(it)} className="text-blue-600">{it.docName}</button></td><td className="px-3 py-2">{it.tm_id}</td><td className="px-3 py-2">{it.status||'—'}</td><td className="px-3 py-2"><div className="flex gap-2"><button onClick={()=>onEdit(it)} className="px-2 py-1 bg-yellow-50 rounded">Edit</button><button onClick={()=>onDelete(it)} className="px-2 py-1 bg-red-50 rounded">Del</button></div></td></tr>))}</tbody></table></div>);
}
