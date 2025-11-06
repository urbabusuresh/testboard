"use client";
import {
  Select,
  SelectItem,
  Spinner,
} from '@heroui/react';
import { fetchRuns } from '@/lib/runsControl';
import React, { useContext, useEffect, useState } from "react";
import {
  listTestCases,
  getTestCase,
  createTestCase,
  updateTestCase,
  deleteTestCase,
  exportTestCasesCsvUrl,
} from "@/lib/testcasesApi";
import TestCaseTable from "./TestCaseTable";
import TestCaseForm from "./TestCaseForm";
import TestCaseDrawer from "./TestCaseDrawer";
import { Divider } from "@heroui/react";
import { RunType } from '@/types/run';
import { TokenContext } from '@/utils/TokenProvider';
import MemberSelector, { ProjectMember } from '@/src/app/[locale]/projects/[projectId]/members/MemberSelector';

export default function TestCasesClient({
  projectIdProp,
  localeProp,
  tsCodeProp,
}: {
  projectIdProp?: number | string;
  localeProp?: string;
  tsCodeProp?: string;
}) {
  
const [assignedMembers, setAssignedMembers] = useState<ProjectMember[]>([]);
  const [assignedTesters, setAssignedTesters] = useState<ProjectMember[]>([]);
  const [runs, setRuns] = useState<RunType[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>(""); // 🆕 added
  const [moduleOptions, setModuleOptions] = useState<string[]>([]); // 🆕 added
  const [projectId, setProjectId] = useState<number | string>(projectIdProp ?? "");
  const [page, setPage] = useState(1);
  const [size] = useState(25);
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ total: number }>({ total: 0 });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | undefined>();
 const [buildId, setBuildId] = useState<string | number|undefined>();
   const tokenCtx = useContext(TokenContext);

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "";
  // 🆕 Load module list once
  async function loadModules() {
    try {
      const res = await fetch(`${API_BASE}/api/testmodules/modules/list?projectId=${projectId}`);
      const data = await res.json();
      if (data?.items) setModuleOptions(data.items);
    } catch (e: any) {
      console.error("Failed to load modules:", e);
    }
  }

  async function load() {
    setLoading(true);
    setError(undefined);
    try {
      const res: any = await listTestCases({
        q,
        tsCodeProp,
        projectId,
        page,
        size,
        module: moduleFilter || undefined, // 🆕 include module filter
        buildId: buildId || undefined,
         spoc:
    assignedMembers.length > 0
      ? assignedMembers.map((s) => s.username).join(',')
      : undefined,
         testers:
    assignedTesters.length > 0
      ? assignedTesters.map((s) => s.username).join(',')
      : undefined,
      });
      setItems(res.items || []);
      setMeta(res.meta || { total: 0 });
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }
useEffect(() => {
    const loadRuns = async () => {
      if (!tokenCtx?.isSignedIn?.() || !projectId) return;
      try {
        setRunsLoading(true);
        setRunsError(null);
        const data = await fetchRuns(tokenCtx.token.access_token, Number(projectId));
        setRuns(Array.isArray(data) ? data : []);
      } catch (error) {
        setRunsError('Failed to fetch builds');
      } finally {
        setRunsLoading(false);
      }
    };
    loadRuns();
  }, [tokenCtx, projectId]);
  useEffect(() => {
    loadModules(); // 🆕 load module options on mount
  }, [projectId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, projectId, page, moduleFilter,buildId]); // 🆕 also reload on module change

  async function handleView(it: any) {
    try {
      const d = await getTestCase(it.tc_sid);
      setSelected(d);
    } catch (e: any) {
      alert(String(e));
    }
  }

  function handleClose() {
    setSelected(null);
  }
  function handleNew() {
    setEditing(null);
    setShowForm(true);
  }
  function handleEdit(it: any) {
    setEditing(it);
    setShowForm(true);
  }
  async function handleDelete(it: any) {
    if (!confirm("Delete?")) return;
    await deleteTestCase(it.tc_sid);
    load();
  }
  async function handleSave(p: any) {
    try {
      if (editing && editing.tc_sid) await updateTestCase(editing.tc_sid, p);
      else await createTestCase(p);
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(String(e));
    }
  }

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / size));
  return (
    <div className="p-1">
      <div className="mb-2 flex gap-2 items-center">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-2 py-1 border rounded"
        >
          Prev
        </button>
       
          



        <input
          value={q}
        
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search text..."
          className="input border p-1 rounded w-64"
        />

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
        
                    <div className="mb-2 flex gap-2 items-center">
          <Select
            size="sm"
            variant="bordered"
            className='w-full'
           
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string | undefined;
              const id = selected ? Number(selected) : '';
              setBuildId(id);
             
            }}
            isLoading={runsLoading}
            disallowEmptySelection={false}
            placeholder={runsLoading ? 'Loading…' : 'Select a build'}
          >
            {runsError ? (
              <SelectItem key="__error" isDisabled>
                {runsError}
              </SelectItem>
            ) : runs.length > 0 ? (
              runs.map((r) => (
                <SelectItem key={String(r.id)} textValue={r.name}>
                  {r.name}
                </SelectItem>
              ))
            ) : runsLoading ? (
              <SelectItem key="__loading" isDisabled>
                <div className="flex items-center gap-2">
                  <Spinner size="sm" /> Loading…
                </div>
              </SelectItem>
            ) : (
              <SelectItem key="__empty" isDisabled>
                No builds found
              </SelectItem>
            )}
          </Select>
        </div>

<div>
        <MemberSelector
          projectId={Number(projectId)}
          label="SPOC / Owner"
          allowMultiple={true}
          selectedMembers={assignedMembers}
          onChange={(members) => setAssignedMembers(members)}
        />
        <MemberSelector
          projectId={Number(projectId)}
          label="Testers"
          allowMultiple={true}
          selectedMembers={assignedTesters}
          onChange={(members) => setAssignedTesters(members)}
        />

          {/* Preview selected members */}
      {/* {assignedMembers.length > 0 && (
        <div className="mt-2 text-sm text-gray-700">
          <span className="font-semibold">Selected Members: </span>
          {assignedMembers.map((m) => m.username).join(", ")}
        </div>
      )} */}
      </div>

        <button
          onClick={() => {
            setPage(1);
            load();
          }}
          className="px-3 py-1 rounded bg-blue-600 text-white"
        >
          Search
        </button>
         
        <div className="ml-auto flex">
          <a
            href={exportTestCasesCsvUrl({ q, projectId, module: moduleFilter })}
            className="px-3 py-1 rounded bg-gray-100"
          >
            Export
          </a>
        </div>
        <div className=" text-sm text-gray-600">
        Total: {meta.total || 0} <br/> Page {page} / {totalPages}
      </div>
      <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 py-1 border rounded"
        >
          Next
        </button>
      </div>

      
<Divider/>
      {loading ? (
        <div className="p-4">Loading…</div>
      ) : error ? (
        <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>
      ) : (
        <TestCaseTable
          items={items}
          locale={localeProp}
          projectId={projectIdProp}
          buildId={buildId}
          tsCodeProp={tsCodeProp}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-2 py-1 border rounded"
        >
          Prev
        </button>
        <div className="text-sm">
          Page {page} / {totalPages}
        </div>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 py-1 border rounded"
        >
          Next
        </button>
      </div>

      {selected ? <TestCaseDrawer testcase={selected} onClose={handleClose} /> : null}

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-30"
            onClick={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
          <div className="bg-white p-6 rounded shadow-md w-[760px] z-50">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? "Edit" : "Create"}
            </h2>
            <TestCaseForm
              initial={editing ?? undefined}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
              onSave={handleSave}
              buildId={buildId}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
