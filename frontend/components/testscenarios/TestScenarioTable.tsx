"use client";
import { EditIcon, Trash2, Trash2Icon, ViewIcon } from "lucide-react";
import React from "react";
export default function TestScenarioTable({items,viewTestCases,onView,onEdit,onDelete}:{items:any[];viewTestCases:any,onView:any;onEdit:any;onDelete:any;}){
  return (<div className="overflow-x-auto bg-white rounded shadow-sm">
    <table className="min-w-full divide-y divide-gray-200 text-sm  text-left">
      <thead className="bg-gray-50 text-left">
        <tr>
          <th className="px-3 py-2">Id</th>
          
        <th className="px-3 py-2">Test Scenario</th>
       
        <th className="px-3 py-2">Description</th>
         <th className="px-3 py-2">Module</th>
         <th className="px-3 py-2"> Testcases</th>
        <th className="px-3 py-2">Actions</th>
        
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {items.length===0? <tr><td colSpan={5} className="p-6 text-center text-gray-500">No scenarios</td>
        </tr>: items.map(it=> (
          <tr key={it.ts_sid}>
            <td className="px-3 py-2">#{it.ts_sid}<br/>
             
          <span
    className={
      "font-medium " +
      ((it.ts_type === "Positive" || it.ts_type === "Positive ")
        ? "text-green-600"
        : (it.ts_type === "Negative" || it.ts_type === "Negative ")
        ? "text-red-600"
        : "text-gray-600")
    }
  >
     <small>{it.ts_type || '-'}</small>
  </span>
          
          
            </td>
            
      
            <td className="px-3 py-2"><button onClick={()=>onView(it)} className="text-blue-600">{it.ts_id}</button>
             <br/>
           
            <small style={{ color: '#2f0055ff' }}>#{it.uc_id||'—'}</small>
            </td>
       
        <td className="px-3 py-2">{it.ts_description||'—'}</td>
        
              <td className="px-3 py-2"><small>{it.module||'-'}</small></td>
              <td className="px-3 py-2"><small>
                
                 <button onClick={()=>viewTestCases(it)} title="View Test Cases" className="px-2 py-1 bg-blue-50  text-sm rounded">{it.testcase_count||'-'}</button>
         
                </small></td>
              
        <td className="px-3 py-2"><div className="flex gap-2">
          <button onClick={()=>onView(it)} title="View/Edit TestScenarios" className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded"><EditIcon className="h-4 w-4" /></button>
        <button onClick={()=>onDelete(it)} title="Delete TestScenarios" className="px-2 py-1 bg-red-50 text-red-600 rounded"><Trash2 className="h-4 w-4" /></button>
        </div></td>
        </tr>))}</tbody></table></div>);
}
