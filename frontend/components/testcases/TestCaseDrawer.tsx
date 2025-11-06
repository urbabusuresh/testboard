"use client";

import React, { useEffect, useState } from "react";
import { TestCase } from "@/types/testcase";
import { X, Edit2, Check, Trash2, Eye, Save } from "lucide-react";
import MemberSelector from "@/src/app/[locale]/projects/[projectId]/members/MemberSelector";

type Props = {
  testcase?: Partial<TestCase> | null;
  initialDefaults?: Partial<TestCase> | null;
  onClose: () => void;
  onCreate?: (payload: Partial<TestCase>) => Promise<void>;
  onUpdate?: (tc_sid: number, payload: Partial<TestCase>) => Promise<void>;
  onDelete?: (tc_sid: number) => Promise<void>;
  onSaved?: () => void;
};

// Small presentational field wrappers to keep markup tidy
function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-slate-500">{children}</div>;
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="mt-1">{children}</div>;
}

/**
 * Professional TestCase Drawer
 * - polished two-column layout
 * - sticky meta sidebar with quick actions
 * - chips for testers (comma/enter to add)
 * - JSON editors show validation state
 * - nicer header with icons, badges and contextual actions
 */
export default function TestCaseDrawer({
  testcase,
  initialDefaults,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onSaved,
}: Props) {
  const isEditInitial = Boolean(testcase && (testcase.tc_sid || testcase.tc_id));
  const [mode, setMode] = useState<"view" | "edit" | "create">(isEditInitial ? "view" : "create");

  // form fields (condensed init for brevity)
  const [projectId, setProjectId] = useState<string | number | "">(testcase?.projectId ?? initialDefaults?.projectId ?? "");
  const [ts_sid, setTsSid] = useState<string | number | "">(testcase?.ts_sid ?? initialDefaults?.ts_sid ?? "");
  const [tc_id, setTcId] = useState<string>(testcase?.tc_id ?? initialDefaults?.tc_id ?? "");
  const [tc_description, setTcDescription] = useState<string>(testcase?.tc_description ?? initialDefaults?.tc_description ?? "");
  const [rawSteps, setRawSteps] = useState<string>(
    testcase?.rawSteps ?? (testcase?.steps && Array.isArray(testcase.steps) ? testcase.steps.map((s: any) => s.action).join("\n") : initialDefaults?.rawSteps ?? "")
  );

  const [tc_data, setTcData] = useState<string>(testcase?.tc_data ? JSON.stringify(testcase.tc_data, null, 2) : "");
  const [expected_results, setExpectedResults] = useState<string>(testcase?.expected_results ? (typeof testcase.expected_results === "string" ? testcase.expected_results : JSON.stringify(testcase.expected_results, null, 2)) : "");
  const [status, setStatus] = useState<string>(testcase?.status ?? initialDefaults?.status ?? "Draft");
  const [spoc, setSpoc] = useState<string>(testcase?.spoc ?? "");
  const [pot_link, setPotLink] = useState<string>(testcase?.pot_link ?? "");
  const [bug_id, setBugId] = useState<string>(testcase?.bug_id ?? "");
  const [tracability, setTracability] = useState<string>(testcase?.tracability ? JSON.stringify(testcase.tracability, null, 2) : "");

  // testers as chips
  const [testers, setTesters] = useState<string[]>(
    Array.isArray(testcase?.testers)
      ? testcase!.testers!.slice()
      : typeof testcase?.testers === "string"
      ? testcase!.testers!.split(",").map((s: string) => s.trim()).filter(Boolean)
      : (initialDefaults?.testers && Array.isArray(initialDefaults.testers) ? initialDefaults.testers.slice() : [])
  );
  const [testerInput, setTesterInput] = useState("");

  // ui state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [jsonErrors, setJsonErrors] = useState<{ tc_data?: string; expected?: string; tracability?: string } | null>(null);

  // sync props -> local
  useEffect(() => {
    setProjectId(testcase?.projectId ?? initialDefaults?.projectId ?? projectId);
    setTsSid(testcase?.ts_sid ?? initialDefaults?.ts_sid ?? ts_sid);
    setTcId(testcase?.tc_id ?? initialDefaults?.tc_id ?? tc_id);
    setTcDescription(testcase?.tc_description ?? initialDefaults?.tc_description ?? tc_description);
    setRawSteps(testcase?.rawSteps ?? (testcase?.steps && Array.isArray(testcase.steps) ? testcase.steps.map((s: any) => s.action).join("\n") : initialDefaults?.rawSteps ?? rawSteps));
    setTcData(testcase?.tc_data ? JSON.stringify(testcase.tc_data, null, 2) : tc_data);
    setExpectedResults(testcase?.expected_results ? (typeof testcase.expected_results === "string" ? testcase.expected_results : JSON.stringify(testcase.expected_results, null, 2)) : expected_results);
    setSpoc(testcase?.spoc ?? spoc);
    setStatus(testcase?.status ?? initialDefaults?.status ?? status);
    setPotLink(testcase?.pot_link ?? pot_link);
    setBugId(testcase?.bug_id ?? bug_id);
    setTracability(testcase?.tracability ? JSON.stringify(testcase.tracability, null, 2) : tracability);
    setTesters(Array.isArray(testcase?.testers) ? testcase!.testers!.slice() : (testcase?.testers ? String(testcase.testers).split(",").map((s:string)=>s.trim()).filter(Boolean) : testers));
    setMode(testcase ? "view" : "create");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testcase, initialDefaults]);

  // escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // validate JSON fields
  useEffect(() => {
    const errs: any = {};
    function safeParse(value?: string) {
      if (!value || value.trim() === "") return undefined;
      try { return JSON.parse(value); } catch { return "__INVALID__"; }
    }
    if (safeParse(tc_data) === "__INVALID__") errs.tc_data = "Invalid JSON";
    if (safeParse(expected_results) === "__INVALID__") errs.expected = "Invalid JSON";
    if (safeParse(tracability) === "__INVALID__") errs.tracability = "Invalid JSON";
    setJsonErrors(Object.keys(errs).length ? errs : null);
  }, [tc_data, expected_results, tracability]);

  function addTesterFromInput() {
    const v = testerInput.trim();
    if (!v) return;
    const parts = v.split(",").map(s => s.trim()).filter(Boolean);
    setTesters(prev => Array.from(new Set([...prev, ...parts])));
    setTesterInput("");
  }

  function removeTester(index: number) {
    setTesters(prev => prev.filter((_, i) => i !== index));
  }

  function parseCsvToArray(v: string[] | undefined) {
    return v ?? [];
  }

  function safeParseJsonOrUndefined(v: string | undefined) {
    if (!v || v.trim() === "") return undefined;
    try { return JSON.parse(v); } catch { return "__INVALID__"; }
  }

  async function handleSave() {
    setError(null);
    if (jsonErrors) { setError("Fix JSON fields"); return; }
    if (!projectId) { setError("projectId required"); return; }

    const payload: Partial<TestCase> = {
      projectId: typeof projectId === "string" && projectId !== "" ? Number(projectId) : (projectId as number | undefined),
      ts_sid: typeof ts_sid === "string" && ts_sid !== "" ? Number(ts_sid) : (ts_sid as number | undefined),
      tc_id: tc_id || undefined,
      tc_description: tc_description || undefined,
      rawSteps: rawSteps || undefined,
      tc_data: safeParseJsonOrUndefined(tc_data),
      expected_results: safeParseJsonOrUndefined(expected_results),
      spoc: spoc || undefined,
      status: status || undefined,
      pot_link: pot_link || undefined,
      bug_id: bug_id || undefined,
      tracability: safeParseJsonOrUndefined(tracability),
      testers: testers,
    };

    try {
      setSaving(true);
      if (mode === "create") {
        if (!onCreate) throw new Error("onCreate not provided");
        await onCreate(payload);
        setMessage("Created successfully");
      } else {
        if (!onUpdate) throw new Error("onUpdate not provided");
        if (!testcase?.tc_sid) throw new Error("tc_sid missing");
        await onUpdate(testcase.tc_sid, payload);
        setMessage("Saved");
      }
      onSaved?.();
      setTimeout(() => { setMessage(null); onClose(); }, 600);
    } catch (err: any) {
      setError(String(err?.message ?? err ?? "Save failed"));
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!onDelete) { setError("Delete handler not available"); return; }
    if (!testcase?.tc_sid) { setError("tc_sid missing"); return; }
    if (!confirm("Delete this test case?")) return;
    try {
      setDeleting(true);
      await onDelete(testcase.tc_sid);
      onSaved?.();
      onClose();
    } catch (err: any) {
      setError(String(err?.message ?? err ?? "Delete failed"));
    } finally { setDeleting(false); }
  }

  // Render
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div className="flex-1 bg-black/45 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <aside className="w-full max-w-[1100px] h-screen bg-white shadow-2xl overflow-auto p-6 flex flex-col" aria-label="Test case drawer">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 sticky top-0 bg-white/80 backdrop-blur-md py-4 z-10">
          <div className="min-w-0 flex items-start gap-4">
            <div className="rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white w-12 h-12 flex items-center justify-center font-semibold text-lg">TC</div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate">{tc_id || tc_description || (mode === 'create' ? 'New Test Case' : 'Test Case')}</h2>
              <div className="mt-1 text-sm text-slate-500 flex flex-wrap gap-2 items-center">
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">SID: {testcase?.tc_sid ?? '—'}</span>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">Project: {projectId ?? '—'}</span>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">Scenario: {ts_sid ?? '—'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'view' ? (
              <>
                <button onClick={() => setMode('edit')} className="inline-flex items-center gap-2 px-3 py-1 border rounded hover:bg-slate-50"><Edit2 size={14}/> Edit</button>
                {onDelete && <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded">{deleting ? 'Deleting…' : (<><Trash2 size={14}/> Delete</>)}</button>}
              </>
            ) : (
              <>
                <button onClick={() => setMode('view')} className="px-3 py-1 border rounded">Cancel</button>
                <button onClick={handleSave} disabled={saving || Boolean(jsonErrors)} className="inline-flex items-center gap-2 px-3 py-1 bg-sky-600 text-white rounded">{saving ? 'Saving…' : (<><Save size={14}/> {mode === 'create' ? 'Create' : 'Save'}</>)}</button>
              </>
            )}

            <button onClick={onClose} className="p-2 rounded hover:bg-slate-100"><X size={16} /></button>
          </div>
        </div>

        {/* messages */}
        <div className="mt-4 space-y-2">
          {message && <div className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded">{message}</div>}
          {error && <div className="text-sm text-rose-700 bg-rose-50 p-2 rounded">{error}</div>}
          {jsonErrors && <div className="text-sm text-yellow-800 bg-yellow-50 p-2 rounded">JSON validation issues present — fix before saving.</div>}
        </div>

        {/* Main content */}
        <div className="mt-6 grid grid-cols-12 gap-6 flex-1">
          {/* Left: form */}
          <div className="col-span-8">
            {(mode === 'view') && (
              <div className="space-y-6">
                <section className="bg-slate-50 p-4 rounded">
                  <Label>Description</Label>
                  <Field><div className="whitespace-pre-wrap text-slate-800">{tc_description || '—'}</div></Field>
                </section>

                <section>
                  <Label>Steps</Label>
                  <Field><pre className="mt-2 p-3 bg-slate-50 rounded text-xs whitespace-pre-wrap">{rawSteps || '—'}</pre></Field>
                </section>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Field><div className="text-slate-700">{testcase?.tc_type ?? '—'}</div></Field>
                  </div>
                  <div>
                    <Label>Expected</Label>
                    <Field><div className="text-slate-700 whitespace-pre-wrap">{expected_results || '—'}</div></Field>
                  </div>
                </div>

                <div>
                  <Label>Traceability</Label>
                  <Field><pre className="mt-2 p-3 bg-slate-50 rounded text-xs overflow-auto">{testcase?.tracability ? JSON.stringify(testcase.tracability, null, 2) : '—'}</pre></Field>
                </div>
              </div>
            )}

            {(mode === 'edit' || mode === 'create') && (
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                

                <div>
                  <Label>Testcase ID</Label>
                  <Field>
                    <input value={tc_id} onChange={(e) => setTcId(e.target.value)} className="w-full border rounded px-3 py-2" />
                  </Field>
                </div>

                <div>
                  <Label>Description</Label>
                  <Field>
                    <textarea value={tc_description} onChange={(e) => setTcDescription(e.target.value)} className="w-full border rounded px-3 py-2 min-h-[90px]" />
                  </Field>
                </div>

                <div>
                  <Label>Steps (one per line)</Label>
                  <Field>
                    <textarea value={rawSteps} onChange={(e) => setRawSteps(e.target.value)} className="w-full border rounded px-3 py-2 min-h-[140px] font-mono text-sm" />
                    <div className="text-xs text-slate-400 mt-1">Tip: use one line per step. Use  to mark assertions.</div>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Test Data (JSON)</Label>
                    <Field>
                      <textarea value={tc_data} onChange={(e) => setTcData(e.target.value)} className={`w-full border rounded px-3 py-2 min-h-[80px] font-mono text-sm ${jsonErrors?.tc_data ? 'border-rose-400 bg-rose-50' : ''}`} />
                      {jsonErrors?.tc_data && <div className="text-xs text-rose-600 mt-1">{jsonErrors.tc_data}</div>}
                    </Field>
                  </div>

                  <div>
                    <Label>Expected Results</Label>
                    <Field>
                      <textarea value={expected_results} onChange={(e) => setExpectedResults(e.target.value)} className={`w-full border rounded px-3 py-2 min-h-[80px] ${jsonErrors?.expected ? 'border-rose-400 bg-rose-50' : ''}`} />
                      {jsonErrors?.expected && <div className="text-xs text-rose-600 mt-1">{jsonErrors.expected}</div>}
                    </Field>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Field>
                      <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border rounded px-3 py-2">
                        <option>Draft</option>
                        <option>Ready</option>
                        <option>Blocked</option>
                        <option>Done</option>
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Label>SPOC</Label>
                    <Field>
                      <input value={spoc} onChange={(e) => setSpoc(e.target.value)} className="w-full border rounded px-3 py-2" />
                    </Field>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>PO/T Link</Label>
                    <Field>
                      <input value={pot_link} onChange={(e) => setPotLink(e.target.value)} className="w-full border rounded px-3 py-2" />
                    </Field>
                  </div>

                  <div>
                    <Label>Bug ID</Label>
                    <Field>
                      <input value={bug_id} onChange={(e) => setBugId(e.target.value)} className="w-full border rounded px-3 py-2" />
                    </Field>
                  </div>
                </div>

                <div>
                  <Label>Traceability (JSON)</Label>
                  <Field>
                    <textarea value={tracability} onChange={(e) => setTracability(e.target.value)} className={`w-full border rounded px-3 py-2 min-h-[80px] font-mono text-sm ${jsonErrors?.tracability ? 'border-rose-400 bg-rose-50' : ''}`} />
                    {jsonErrors?.tracability && <div className="text-xs text-rose-600 mt-1">{jsonErrors.tracability}</div>}
                  </Field>
                </div>

                {/* testers chips */}
                <div>
                  <Label>Testers</Label>
                  <Field>
                    <MemberSelector
                      projectId={Number(projectId)}
                      allowMultiple={true}
                      selectedMembers={testers.map(name => ({ username: name, name: name, email: '' }))}
                      onChange={(members) => setTesters(members.map(m => m.username))}
                    />
                  </Field>
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { if (testcase) setMode('view'); else onClose(); }} className="px-4 py-2 border rounded">Cancel</button>
                  <button type="submit" disabled={saving || Boolean(jsonErrors)} className="px-4 py-2 bg-sky-600 text-white rounded inline-flex items-center gap-2">{saving ? 'Saving…' : (<><Check size={14}/> {mode === 'create' ? 'Create' : 'Save'}</>)}</button>
                </div>

              </form>
            )}
          </div>

          {/* Right: sticky meta / preview */}
          <div className="col-span-4">
            <div className="sticky top-28 space-y-4">
              <div className="bg-white border rounded p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Status</div>
                    <div className="mt-1 font-medium">{status}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">SPOC</div>
                    <div className="mt-1 font-medium">{spoc || '—'}</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify({ tc_id, tc_description, status }, null, 2)); setMessage('Copied summary to clipboard'); setTimeout(()=>setMessage(null),1200); }} className="px-2 py-1 border rounded text-sm">Copy Summary</button>
                  <button onClick={() => setMode(mode === 'view' ? 'edit' : 'view')} className="px-2 py-1 border rounded text-sm">{mode === 'view' ? 'Edit' : 'Preview'}</button>
                </div>
              </div>

              <div className="bg-white border rounded p-4">
                <div className="text-xs text-slate-500">Quick Preview</div>
                <div className="mt-2 text-sm space-y-2">
                  <div className="text-slate-700 font-medium truncate">{tc_id || '—'}</div>
                  <div className="text-xs text-slate-500 line-clamp-3">{tc_description || '—'}</div>
                  <div className="mt-2 text-xs text-slate-400">Testers: {testers.length ? testers.join(', ') : '—'}</div>
                </div>
              </div>

              <div className="bg-white border rounded p-4">
                <div className="text-xs text-slate-500">Traceability (preview)</div>
                <pre className="mt-2 max-h-40 overflow-auto text-xs bg-slate-50 p-2 rounded">{tracability || '—'}</pre>
              </div>

            </div>
          </div>
        </div>

      </aside>
    </div>
  );
}
