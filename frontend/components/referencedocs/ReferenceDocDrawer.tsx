"use client";
import React from "react";
export default function ReferenceDocDrawer({doc,onClose}:{doc:any;onClose:any;}){
  return (<div className="fixed inset-0 z-40 flex"><div className="flex-1" onClick={onClose}></div><div className="w-96 bg-white p-4 shadow-xl overflow-auto"><h3 className="text-lg font-semibold">{doc.docName}</h3><div className="text-sm text-gray-600">rd_id: {doc.rd_id}</div><div className="mt-3"><pre className="text-xs">{doc.notes||'—'}</pre></div></div></div>);
}
