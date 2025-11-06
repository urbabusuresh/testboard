"use client";

import React, { useEffect, useState } from "react";
import { X, Edit2, Save, Trash2, Plus, Clipboard } from "lucide-react";
import MemberSelector from "@/src/app/[locale]/projects/[projectId]/members/MemberSelector";

export type TestScenario = {
  ts_sid?: number;
  projectId?: number;
  uc_sid?: number;
  ts_id?: string;
  uc_id?: string | null;
  ts_description?: string | null;
  ts_type?: string | null;
  remarks?: string | null;
  testers?: string[] | null;
  preparation_effort?: string | null;
  tracability?: any | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

export type TestCaseDefaultForCreate = {
  projectId?: number;
  ts_sid?: number;
  ts_id?: string | null;
  uc_sid?: number;
  uc_id?: string | null;
  tc_id?: string;
  tc_description?: string;
  testers?: string[] | null;
  status?: string | null;
};

type Props = {
  scenario?: TestScenario | null;
  projectIdPrefill?: number | string;
  ucSidPrefill?: number | string;
  onClose: () => void;
  onCreate?: (payload: Partial<TestScenario>) => Promise<void>;
  onUpdate?: (ts_sid: number, payload: Partial<TestScenario>) => Promise<void>;
  onDelete?: (ts_sid: number) => Promise<void>;
  onSaved?: () => void;
  onCreateTestcase?: (defaults: TestCaseDefaultForCreate) => void;
};

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-slate-500">{children}</div>;
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="mt-1">{children}</div>;
}

export default function UseCaseScenarioDrawer({
  scenario,
  projectIdPrefill,
  ucSidPrefill,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onSaved,
  onCreateTestcase,
}: Props) {
  const isEditInitial = Boolean(scenario && (scenario.ts_sid || scenario.ts_id));
  const [mode, setMode] = useState<"view" | "edit" | "create">(isEditInitial ? "view" : "create");

  const [projectId, setProjectId] = useState<string | number | "">(scenario?.projectId ?? projectIdPrefill ?? "");
  const [uc_sid, setUcSid] = useState<string | number | "">(scenario?.uc_sid ?? ucSidPrefill ?? "");
  const [tsId, setTsId] = useState<string>(scenario?.ts_id ?? "");
  const [tsDescription, setTsDescription] = useState<string>(scenario?.ts_description ?? "");
  const [tsType, setTsType] = useState<string>(scenario?.ts_type ?? "");
  const [remarks, setRemarks] = useState<string>(scenario?.remarks ?? "");
  const [preparationEffort, setPreparationEffort] = useState<string>(scenario?.preparation_effort ?? "");
  const [tracability, setTracability] = useState<string>(scenario?.tracability ? JSON.stringify(scenario.tracability, null, 2) : "");

  const [testers, setTesters] = useState<string[]>(
    Array.isArray(scenario?.testers) ? scenario!.testers!.slice() : (scenario?.testers ? String(scenario.testers).split(",").map(s => s.trim()).filter(Boolean) : [])
  );
  const [testerInput, setTesterInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traceJsonError, setTraceJsonError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setProjectId(scenario?.projectId ?? projectIdPrefill ?? "");
    setUcSid(scenario?.uc_sid ?? ucSidPrefill ?? "");
    setTsId(scenario?.ts_id ?? "");
    setTsDescription(scenario?.ts_description ?? "");
    setTsType(scenario?.ts_type ?? "");
    setRemarks(scenario?.remarks ?? "");
    setPreparationEffort(scenario?.preparation_effort ?? "");
    setTracability(scenario?.tracability ? JSON.stringify(scenario.tracability, null, 2) : "");
    setTesters(Array.isArray(scenario?.testers) ? scenario!.testers!.slice() : (scenario?.testers ? String(scenario.testers).split(",").map(s => s.trim()).filter(Boolean) : []));
    setMode(scenario ? "view" : "create");
    setError(null);
    setTraceJsonError(null);
    setMessage(null);
  }, [scenario, projectIdPrefill, ucSidPrefill]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!tracability || tracability.trim() === "") {
      setTraceJsonError(null);
      return;
    }
    try {
      JSON.parse(tracability);
      setTraceJsonError(null);
    } catch (err: any) {
      setTraceJsonError(String(err?.message ?? "Invalid JSON"));
    }
  }, [tracability]);

  function addTester() {
    const v = testerInput.trim();
    if (!v) return;
    const parts = v.split(",").map(s => s.trim()).filter(Boolean);
    setTesters(prev => Array.from(new Set([...prev, ...parts])));
    setTesterInput("");
  }

  function removeTester(i: number) {
    setTesters(prev => prev.filter((_, idx) => idx !== i));
  }

  function parseTestersList(input: string[]) {
    return input ?? [];
  }

  function safeParseJsonOrUndefined(v?: string) {
    if (!v || v.trim() === "") return undefined;
    try { return JSON.parse(v); } catch { return "__INVALID__"; }
  }

  async function handleSaveScenario() {
    setError(null);
    if (traceJsonError) { setError("Traceability JSON is invalid."); return; }
    if (!projectId) { setError("projectId is required."); return; }
    if (!uc_sid) { setError("uc_sid (parent usecase id) is required."); return; }

    const payload: Partial<TestScenario> = {
      projectId: typeof projectId === "string" && projectId !== "" ? Number(projectId) : (projectId as number | undefined),
      uc_sid: typeof uc_sid === "string" && uc_sid !== "" ? Number(uc_sid) : (uc_sid as number | undefined),
      ts_id: tsId || undefined,
      ts_description: tsDescription || undefined,
      ts_type: tsType || undefined,
      remarks: remarks || undefined,
      testers: parseTestersList(testers),
      preparation_effort: preparationEffort || undefined,
      tracability: safeParseJsonOrUndefined(tracability),
    };

    try {
      setSaving(true);
      if (mode === "create") {
        if (!onCreate) throw new Error("onCreate handler not provided");
        await onCreate(payload);
        setMessage("Scenario created");
      } else {
        if (!onUpdate) throw new Error("onUpdate handler not provided");
        if (!scenario?.ts_sid) throw new Error("Scenario id missing");
        await onUpdate(scenario.ts_sid, payload);
        setMessage("Scenario updated");
      }
      onSaved?.();
      setMode("view");
      setTimeout(() => setMessage(null), 2000);
    } catch (err: any) {
      setError(String(err?.message ?? err ?? "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteScenario() {
    if (!onDelete) { setError("Delete handler not provided"); return; }
    if (!scenario?.ts_sid) { setError("Scenario id missing"); return; }
    if (!confirm("Delete this scenario?")) return;
    try {
      setDeleting(true);
      await onDelete(scenario.ts_sid);
      onSaved?.();
      onClose();
    } catch (err: any) {
      setError(String(err?.message ?? err ?? "Delete failed"));
    } finally { setDeleting(false); }
  }

  function handleCreateTestcaseFromScenario() {
    if (!onCreateTestcase) { setError("Create-testcase action is not available."); return; }

    const defaults: TestCaseDefaultForCreate = {
      projectId: typeof projectId === "string" && projectId !== "" ? Number(projectId) : (projectId as number | undefined),
      ts_sid: scenario?.ts_sid ?? undefined,
      ts_id: scenario?.ts_id ?? tsId ?? undefined,
      uc_sid: typeof uc_sid === "string" && !isNaN(Number(uc_sid)) ? Number(uc_sid) : (scenario?.uc_sid ?? undefined),
      uc_id: scenario?.uc_id ?? undefined,
      tc_id: "",
      tc_description: scenario?.ts_description ? `${scenario.ts_description} - ` : "",
      testers: scenario?.testers ?? undefined,
      status: "New",
    };

    onCreateTestcase(defaults);
  }

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div className="flex-1 bg-black/45 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <aside className="w-full max-w-[1100px] h-screen bg-white shadow-2xl overflow-auto p-6 flex flex-col" aria-label="Scenario drawer">
        <div className="flex items-start justify-between gap-4 sticky top-0 bg-white/90 py-4 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-semibold">SC</div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate">{mode === 'create' ? 'New Test Scenario' : tsId || tsDescription || 'Test Scenario'}</h2>
              <div className="mt-1 text-sm text-slate-500 flex gap-2">
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">SID: {scenario?.ts_sid ?? '—'}</span>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">Project: {projectId ?? '—'}</span>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">Usecase: {uc_sid ?? '—'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'view' ? (
              <>
                <button onClick={() => { setMode('edit'); setError(null); setMessage(null); }} className="inline-flex items-center gap-2 px-3 py-1 border rounded hover:bg-slate-50"><Edit2 size={14}/> Edit</button>
                <button onClick={handleCreateTestcaseFromScenario} className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600 text-white rounded"><Plus size={14}/> New Testcase</button>
                {onDelete && <button onClick={handleDeleteScenario} disabled={deleting} className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded">{deleting ? 'Deleting…' : (<><Trash2 size={14}/> Delete</>)}</button>}
              </>
            ) : (
              <>
                <button onClick={() => setMode('view')} className="px-3 py-1 border rounded">Cancel</button>
                <button onClick={handleSaveScenario} disabled={saving} className="inline-flex items-center gap-2 px-3 py-1 bg-sky-600 text-white rounded">{saving ? 'Saving…' : (<><Save size={14}/> {mode === 'create' ? 'Create' : 'Save'}</>)}</button>
              </>
            )}

            <button onClick={onClose} className="p-2 rounded hover:bg-slate-100"><X size={16} /></button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {message && <div className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded">{message}</div>}
          {error && <div className="text-sm text-rose-700 bg-rose-50 p-2 rounded">{error}</div>}
          {traceJsonError && <div className="text-sm text-yellow-800 bg-yellow-50 p-2 rounded">Traceability JSON invalid.</div>}
        </div>

        <div className="mt-6 grid grid-cols-12 gap-6 flex-1">
          <div className="col-span-8">
            {mode === 'view' && (
              <div className="space-y-6">
                <section>
                  <Label>Description</Label>
                  <Field><div className="mt-1 text-slate-800 whitespace-pre-wrap">{tsDescription || '—'}</div></Field>
                </section>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Field><div className="text-slate-700">{tsType || '—'}</div></Field>
                  </div>
                  <div>
                    <Label>Preparation effort</Label>
                    <Field><div className="text-slate-700">{preparationEffort || '—'}</div></Field>
                  </div>
                </div>

                <div>
                  <Label>Testers</Label>
                  <Field><div className="text-slate-700">{testers.length ? testers.join(', ') : (scenario?.testers ? (Array.isArray(scenario.testers) ? scenario.testers.join(', ') : String(scenario.testers)) : '—')}</div></Field>
                </div>

                <div>
                  <Label>Traceability</Label>
                  <Field><pre className="mt-2 p-3 bg-slate-50 rounded text-xs overflow-auto">{scenario?.tracability ? JSON.stringify(scenario.tracability, null, 2) : '—'}</pre></Field>
                </div>
              </div>
            )}

            {(mode === 'edit' || mode === 'create') && (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveScenario(); }} className="space-y-5">
                

                <div>
                  <Label>Scenario ID</Label>
                  <Field>
                    <input value={tsId} onChange={(e) => setTsId(e.target.value)} className="w-full border rounded px-3 py-2" />
                  </Field>
                </div>

                <div>
                  <Label>Description</Label>
                  <Field>
                    <textarea value={tsDescription} onChange={(e) => setTsDescription(e.target.value)} className="w-full border rounded px-3 py-2 min-h-[100px]" />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Field>
                      <input value={tsType} onChange={(e) => setTsType(e.target.value)} className="w-full border rounded px-3 py-2" />
                    </Field>
                  </div>
                  <div>
                    <Label>Preparation effort</Label>
                    <Field>
                      <input value={preparationEffort} onChange={(e) => setPreparationEffort(e.target.value)} className="w-full border rounded px-3 py-2" />
                    </Field>
                  </div>
                </div>

                <div>
                  <Label>Testers</Label>
                  <Field>
                    <MemberSelector
                      projectId={Number(projectId)}
                      label="Testers"
                      selectedMembers={testers.map(t => ({ userId: 0, username: t, role: 0 }))}
                      onChange={(members) => setTesters(members.map(m => m.username))}
                    />
                  </Field>
                </div>

                <div>
                  <Label>Remarks</Label>
                  <Field>
                    <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full border rounded px-3 py-2 min-h-[80px]" />
                  </Field>
                </div>

                <div>
                  <Label>Traceability (JSON)</Label>
                  <Field>
                    <textarea value={tracability} onChange={(e) => setTracability(e.target.value)} className={`w-full border rounded px-3 py-2 min-h-[120px] font-mono text-sm ${traceJsonError ? 'border-rose-400 bg-rose-50' : ''}`} />
                    {traceJsonError && <div className="text-xs text-rose-600 mt-1">{traceJsonError}</div>}
                  </Field>
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { if (scenario) setMode('view'); else onClose(); }} className="px-4 py-2 border rounded">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-sky-600 text-white rounded inline-flex items-center gap-2">{saving ? 'Saving…' : (<><Save size={14}/> {mode === 'create' ? 'Create' : 'Save'}</>)}</button>
                </div>

              </form>
            )}
          </div>

          <div className="col-span-4">
            <div className="sticky top-28 space-y-4">
              <div className="bg-white border rounded p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Quick Actions</div>
                    <div className="mt-1 text-sm font-medium">{tsId || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Created</div>
                    <div className="mt-1 text-sm font-medium">{scenario?.createdAt ? new Date(scenario.createdAt).toLocaleString() : '—'}</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify({ tsId, tsDescription, testers }, null, 2)); setMessage('Copied summary'); setTimeout(()=>setMessage(null),1200); }} className="px-2 py-1 border rounded text-sm inline-flex items-center gap-2"><Clipboard size={14}/> Copy</button>
                  <button onClick={handleCreateTestcaseFromScenario} className="px-2 py-1 bg-emerald-600 text-white rounded text-sm inline-flex items-center gap-2"><Plus size={14}/> Testcase</button>
                </div>
              </div>

              <div className="bg-white border rounded p-4">
                <div className="text-xs text-slate-500">Traceability Preview</div>
                <pre className="mt-2 max-h-40 overflow-auto text-xs bg-slate-50 p-2 rounded">{tracability || '—'}</pre>
              </div>

              <div className="bg-white border rounded p-4">
                <div className="text-xs text-slate-500">Preparation effort</div>
                <div className="mt-1 text-sm font-medium">{preparationEffort || '—'}</div>
              </div>
            </div>
          </div>
        </div>

      </aside>
    </div>
  );
}
