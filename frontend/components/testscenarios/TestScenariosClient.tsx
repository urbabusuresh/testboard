// TestScenariosClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  listTestScenarios,
  getTestScenario,
  createTestScenario,
  updateTestScenario,
  deleteTestScenario,
  exportTestScenariosCsvUrl,
} from "@/lib/testscenariosApi";
import TestScenarioTable from "./TestScenarioTable";
import TestScenarioForm from "./TestScenarioForm";
import TestScenarioDrawer from "./TestScenarioDrawer";
import TestCaseDrawer from "../testcases/TestCaseDrawer"; // make sure this path is correct in your project
import { createTestCase, updateTestCase, deleteTestCase } from "@/lib/testcasesApi";

import { useRouter } from "next/navigation";
import { Divider } from "@heroui/react";

export default function TestScenariosClient({ projectIdProp,useCaseCode }: { projectIdProp?: number | string ,useCaseCode?:string}) {
  
  const router = useRouter();
  const [q, setQ] = useState("");
  const [projectId, setProjectId] = useState<number | string>(projectIdProp ?? "");
  const [page, setPage] = useState(1);
  const [size] = useState(25);
  
    const [moduleFilter, setModuleFilter] = useState<string>(""); // 🆕 added
    const [moduleOptions, setModuleOptions] = useState<string[]>([]); // 🆕 added
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ total: number }>({ total: 0 });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null); // scenario selected for drawer (view/edit)
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // TestCase drawer state (opened when creating or editing a testcase)
  const [testcaseDrawerOpen, setTestcaseDrawerOpen] = useState(false);
  const [testcaseDefaults, setTestcaseDefaults] = useState<Partial<any> | null>(null);
  const [editingTestcase, setEditingTestcase] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    setError(undefined);
    try {
      const res: any = await listTestScenarios({ q, projectId,useCaseCode,module:moduleFilter||undefined, page, size });
      setItems(res.items || []);
      setMeta(res.meta || { total: 0 });
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, projectId,  moduleFilter,page]);

  async function handleView(it: any) {
    try {
      const d = await getTestScenario(it.ts_sid);
      setSelected(d);
    } catch (e: any) {
      alert(String(e));
    }
  }
  function handleClose() {
    setSelected(null);
  }

  // Parent handler passed to the Scenario drawer — opens TestCase drawer with defaults
  function handleCreateTestcaseFromScenario(defaults: Partial<any>) {
    // defaults expected to contain: projectId, ts_sid, ts_id, uc_sid, uc_id, tc_description, testers, status, ...
    setTestcaseDefaults({
      projectId: defaults.projectId,
      ts_sid: defaults.ts_sid,
      ts_id: defaults.ts_id,
      uc_sid: defaults.uc_sid,
      uc_id: defaults.uc_id,
      tc_id: defaults.tc_id ?? "",
      tc_description: defaults.tc_description ?? "",
      testers: defaults.testers ?? [],
      status: defaults.status ?? "New",
    });
    setEditingTestcase(null);
    setTestcaseDrawerOpen(true);
  }

 function handleNew() {
  setEditing({
    projectId,
    uc_sid: "", // optional default
  });
  setShowForm(true);
}
  function handleEdit(it: any) {
    setEditing(it);
    setShowForm(true);
  }
  async function handleDelete(it: any) {
    if (!confirm("Delete?")) return;
    await deleteTestScenario(it.ts_sid);
    load();
  }
  async function handleSave(p: any) {
    try {
      if (editing && editing.ts_sid) await updateTestScenario(editing.ts_sid, p);
      else await createTestScenario(p);
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(String(e));
    }
  }

  // --- Testcase drawer handlers: create / update / delete ---
  async function handleCreateTestcase(payload: Partial<any>) {
    try {
      await createTestCase(payload);
      setTestcaseDrawerOpen(false);
      setTestcaseDefaults(null);
      await load();
    } catch (err: any) {
      alert(String(err?.message || err));
    }
  }

  async function handleUpdateTestcase(tc_sid: number, payload: Partial<any>) {
    try {
      await updateTestCase(tc_sid, payload);
      setTestcaseDrawerOpen(false);
      setTestcaseDefaults(null);
      await load();
    } catch (err: any) {
      alert(String(err?.message || err));
    }
  }

  async function handleDeleteTestcase(tc_sid: number) {
    try {
      await deleteTestCase(tc_sid);
      setTestcaseDrawerOpen(false);
      setTestcaseDefaults(null);
      await load();
    } catch (err: any) {
      alert(String(err?.message || err));
    }
  }
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "";
 
    async function loadModules() {
    try {
      const res = await fetch(`${API_BASE}/api/testmodules/modules/list?projectId=${projectId}`);
      const data = await res.json();
      if (data?.items) setModuleOptions(data.items);
    } catch (e: any) {
      console.error("Failed to load modules:", e);
    }
  }
   useEffect(() => {
      loadModules(); // 🆕 load module options on mount
    }, [projectId]);

  function viewTestCases(ts: any) {
    // Choose which identifier to use in the URL: prefer numeric sid (tc_sid), fallback to tc_id
    const sid = ts.ts_sid ?? ts.ts_id;
    const ts_id=ts.ts_id ?? ts.t_id;

    // push to dynamic route
    router.push(`/en/projects/${projectId}/testcases?ts=${ts_id}`);
  }
  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / size));

  return (
    <div className="p-1">
      <div className="mb-4 flex gap-3 items-center">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded">
          Prev
        </button>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search test scenarios" className="input  border p-1 rounded w-60" />
        {/* <input value={projectId as string} onChange={e=>setProjectId(e.target.value)} placeholder="projectId" type="number" className="input w-28" /> */}
        
           {/* 🔹 Module dropdown */}
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="border p-1 rounded w-48"
        >
          <option value="">All Modules</option>
          {moduleOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <button onClick={() => { setPage(1); load(); }} className="px-3 py-1 rounded bg-blue-600 text-white">
          Search
        </button>
        <div className="ml-auto flex gap-2">
          <a href={exportTestScenariosCsvUrl({ q, projectId })} className="px-3 py-1 rounded bg-gray-100">
            Export
          </a>
          {/* <button onClick={handleNew} className="px-3 py-1 rounded bg-green-600 text-white">
            New
          </button> */}
        </div>
         <div className="mb-1 text-sm text-gray-600">
        Total: {meta.total || 0} - Page {page} / {totalPages}
      </div>
      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-2 py-1 border rounded">
          Next
        </button>
      </div>

     
      <Divider/>
      {loading ? (
        <div className="p-4">Loading…</div>
      ) : error ? (
        <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>
      ) : (
        <TestScenarioTable items={items} viewTestCases ={viewTestCases} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded">
          Prev
        </button>
        <div className="text-sm">Page {page} / {totalPages}</div>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-2 py-1 border rounded">
          Next
        </button>
      </div>

      {/* Scenario Drawer: pass function (NOT the object). */}
      {selected ? (
        <TestScenarioDrawer
          scenario={selected}
          onClose={handleClose}
          onCreateTestcase={handleCreateTestcaseFromScenario} // <--- correct handler
          onCreate={async (payload) => { await createTestScenario(payload); await load(); }}
          onUpdate={async (ts_sid, payload) => { await updateTestScenario(ts_sid, payload); await load(); }}
          onDelete={async (ts_sid) => { await deleteTestScenario(ts_sid); await load(); }}
          onSaved={load}
        />
      ) : null}

      {/* Inline modal for creating/editing scenario (unchanged) */}
      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => { setShowForm(false); setEditing(null); }} />
          <div className="bg-white p-6 rounded shadow-md w-[760px] z-50">
            <h2 className="text-lg font-semibold mb-4">{editing ? "Edit" : "Create"}</h2>
            <TestScenarioForm
              initial={editing ?? undefined}
              onCancel={() => { setShowForm(false); setEditing(null); }}
              onSave={handleSave}
            />
          </div>
        </div>
      ) : null}

      {/* TestCase Drawer: opened when creating a new testcase from a scenario (or editing a testcase) */}
      {testcaseDrawerOpen ? (
        <TestCaseDrawer
          testcase={editingTestcase}
          onClose={() => { setTestcaseDrawerOpen(false); setTestcaseDefaults(null); setEditingTestcase(null); }}
          onCreate={handleCreateTestcase}
          onUpdate={handleUpdateTestcase}
          onDelete={handleDeleteTestcase}
          onSaved={load}
          initialDefaults={testcaseDefaults ?? undefined}
        />
      ) : null}
    </div>
  );
}
