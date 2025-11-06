"use client";

import React, { useEffect, useState } from "react";
import { automationApi, ApiError } from "@/utils/automationApi";

/**
 * ModulesDashboard
 *
 * Features:
 * - compact grid of modules (2 cols)
 * - search + add & sync
 * - per-module case counts (fetched after modules load)
 * - confirm-before-sync modal
 * - last-sync result modal (files list)
 * - structured ApiError handling with error details modal
 * - optional create-module flow when backend returns { error: 'module folder not found' }
 *
 * Uses only React + Tailwind (no external UI libs).
 */

export default function ModulesDashboard() {
  const [modules, setModules] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [newModule, setNewModule] = useState("");
  const [syncingModule, setSyncingModule] = useState<string | null>(null);

  const [lastSyncResult, setLastSyncResult] = useState<{ module: string; files: string[] } | null>(null);
  const [showLastSyncModal, setShowLastSyncModal] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  // confirmation modal
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmModule, setConfirmModule] = useState<string | null>(null);

  // error details modal
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // per-module case counts
  const [caseCounts, setCaseCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(false);

  // helper: transient toast
  const showTransientToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 4000);
  };

  // initial load
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await automationApi.listModules();
        if (!mounted) return;
        setModules(data.modules || []);

        // background fetch case counts
        if ((data.modules || []).length > 0) {
          setCountsLoading(true);
          const counts: Record<string, number> = {};
          await Promise.all(
            (data.modules || []).map(async (m: string) => {
              try {
                const res = await automationApi.listCasesByModule(m);
                counts[m] = (res.cases || []).length;
              } catch (e) {
                counts[m] = 0;
              }
            })
          );
          if (mounted) setCaseCounts(counts);
          setCountsLoading(false);
        }
      } catch (err: any) {
        console.error("load modules error:", err);
        handleApiError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filter modules by query
  const filtered = (modules || []).filter((m) => m.toLowerCase().includes(query.toLowerCase()));

  // central API error handler - extracts friendly text and detailed body
  const handleApiError = (err: any) => {
    let userMsg = "Something went wrong";
    let details: string | null = null;

    if (err instanceof ApiError) {
      userMsg = err.body?.error || err.body?.message || err.message || `Server error (${err.status})`;
      if (err.body && typeof err.body === "object") {
        details = JSON.stringify(err.body, null, 2);
      } else if (typeof err.body === "string") {
        details = err.body;
      } else {
        details = err.message ?? String(err);
      }
    } else {
      userMsg = err?.message || (typeof err === "string" ? err : "Unknown error");
      details = typeof err === "string" ? err : err?.stack ? String(err.stack) : JSON.stringify(err);
    }

    setError(userMsg);
    setErrorDetails(details);
    setShowErrorModal(true);
    showTransientToast(userMsg);
    console.error("API error (handled):", err);
  };

  // request confirmation before syncing
  const requestSync = (moduleName: string) => {
    setConfirmModule(moduleName);
    setConfirmVisible(true);
  };

  // performs the actual sync (with robust error handling)
  const doSync = async (moduleName: string) => {
    if (!moduleName) return;
    setSyncingModule(moduleName);
    setLastSyncResult(null);
    setError(null);
    try {
      const res = await automationApi.syncModule(moduleName);
      setLastSyncResult(res);
      setShowLastSyncModal(true);

      // refresh modules list
      try {
        const refreshed = await automationApi.listModules();
        setModules(refreshed.modules || []);
      } catch {
        // ignore refresh errors
      }

      // refresh case count for this module
      try {
        const cases = await automationApi.listCasesByModule(moduleName);
        setCaseCounts((prev) => ({ ...prev, [moduleName]: (cases.cases || []).length }));
      } catch {
        // ignore
      }

      showTransientToast(`Module "${moduleName}" synced`);
      setNewModule("");
    } catch (err: any) {
      // special flow: if backend says module folder not found, allow 'create module'
      if (err instanceof ApiError && (err.body?.error === "module folder not found" || err.message?.toLowerCase().includes("module folder not found"))) {
        // prepare the error modal with a create option
        const tips = `Module folder not found on server.`;
        setError("Module folder not found");
        setErrorDetails(`${tips}\n\nServer response:\n${JSON.stringify(err.body ?? err.message, null, 2)}`);
        setShowErrorModal(true);
        showTransientToast("Module folder not found — you can create it from the error details.");
      } else {
        handleApiError(err);
      }
    } finally {
      setSyncingModule(null);
      setConfirmVisible(false);
      setConfirmModule(null);
    }
  };

  // Called from Add & Sync button: will ask confirmation then sync
  const handleAddAndSync = () => {
    const name = newModule.trim();
    if (!name) {
      showTransientToast("Please enter a module name");
      return;
    }
    requestSync(name);
  };

  // Try to create module on server (if automationApi.createModule exists), then retry sync.
  const tryCreateModuleThenSync = async (moduleName: string) => {
    if (!moduleName) return;
    // detect create function
    const canCreate = typeof (automationApi as any).createModule === "function";
    if (!canCreate) {
      // If backend method is not present, show helpful instructions in modal
      setError("Create module not available");
      setErrorDetails(
        `Frontend couldn't find automationApi.createModule().\n\nTo enable auto-create, add an endpoint and expose a createModule method in utils/automationApi.ts, for example:\n\nPOST /api/autotestcases/modules  { module: "<name>" }\n\nAfter creating the module on server, re-run sync.`
      );
      setShowErrorModal(true);
      return;
    }

    setSyncingModule(moduleName);
    showTransientToast(`Creating module "${moduleName}"...`);
    try {
      // call createModule (assumed signature createModule(name) -> { module: string })
      await (automationApi as any).createModule(moduleName);
      showTransientToast(`Module "${moduleName}" created. Syncing...`);
      // retry sync
      await doSync(moduleName);
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setSyncingModule(null);
    }
  };

  // Confirm modal "Yes, sync"
  const doConfirmSync = async () => {
    if (!confirmModule) return;
    await doSync(confirmModule);
  };

  // UI JSX
  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div>
          <h2 className="text-xl font-semibold">Automation Modules Sync</h2>
          <p className="text-sm text-gray-500">Compact view — search, add & sync automation modules quickly.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search modules..."
              className="w-56 text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-xs px-2 py-1 bg-gray-100 rounded"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 p-2 rounded-lg shadow-sm">
            <input
              value={newModule}
              onChange={(e) => setNewModule(e.target.value)}
              placeholder="Add module..."
              className="w-40 text-sm rounded-md border border-gray-200 px-2 py-1 focus:outline-none"
            />
            <button
              onClick={handleAddAndSync}
              disabled={!newModule || syncingModule !== null}
              className="text-sm px-3 py-1 rounded-md bg-indigo-600 text-white disabled:opacity-60"
            >
              Sync
            </button>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 border border-gray-100 dark:border-neutral-700 mb-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{filtered.length}</span> of <span className="font-medium">{modules?.length ?? 0}</span>
          </div>
          <div className="text-xs text-gray-400">{countsLoading ? "Loading counts..." : "Counts loaded"}</div>
        </div>
      </div>

      {/* Modules compact grid */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 border border-gray-100 dark:border-neutral-700">
        {loading && <div className="text-sm text-gray-500 px-2 py-3">Loading modules…</div>}

        {!loading && (!modules || modules.length === 0) && (
          <div className="text-sm text-gray-500 px-2 py-3">No modules found. Add one above to get started.</div>
        )}

        {!loading && modules && (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((m) => (
              <div
                key={m}
                className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm hover:shadow transition-transform transform hover:-translate-y-0.5"
              >
                <div className="overflow-hidden">
                  <div className="truncate font-medium">{m}</div>
                  <div className="text-xs text-gray-400">
                    Cases: <span className="font-semibold">{caseCounts[m] ?? "—"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    title="Sync module"
                    onClick={() => requestSync(m)}
                    disabled={syncingModule !== null}
                    className="px-2 py-1 text-xs rounded-md bg-indigo-600 text-white disabled:opacity-60"
                  >
                    {syncingModule === m ? "Syncing…" : "Sync"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last sync modal */}
      {showLastSyncModal && lastSyncResult && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowLastSyncModal(false)} />
          <div className="relative max-w-lg w-full bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Synced: {lastSyncResult.module}</h3>
                <p className="text-sm text-gray-500 mt-1">Files returned ({lastSyncResult.files.length}):</p>
              </div>
              <button onClick={() => setShowLastSyncModal(false)} className="text-sm text-gray-500">
                Close
              </button>
            </div>

            <ul className="mt-3 max-h-48 overflow-auto list-disc pl-5 text-sm">
              {lastSyncResult.files.map((f) => (
                <li key={f} className="truncate">
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowLastSyncModal(false)} className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmVisible && confirmModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setConfirmVisible(false)} />
          <div className="relative max-w-md w-full bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold">Confirm sync</h3>
            <p className="text-sm text-gray-500 mt-2">
              Are you sure you want to sync <span className="font-medium">{confirmModule}</span>? This will fetch latest test cases from the repository.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setConfirmVisible(false);
                  setConfirmModule(null);
                }}
                className="px-3 py-1 rounded-md bg-gray-200 text-sm"
              >
                Cancel
              </button>

              <button onClick={doConfirmSync} className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm">
                Yes, sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error details modal (also shows create-module option if available) */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowErrorModal(false)} />
          <div className="relative max-w-lg w-full bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold text-red-600">{error ?? "Error"}</h3>
            <p className="text-sm text-gray-600 mt-2">Details (from server):</p>

            {errorDetails ? (
              <pre className="mt-3 max-h-72 overflow-auto bg-gray-50 dark:bg-neutral-800 p-3 rounded text-xs">{errorDetails}</pre>
            ) : (
              <div className="mt-2 text-sm text-gray-500">No extra details provided by server.</div>
            )}

            <div className="mt-4 flex justify-between items-center gap-2">
              <div className="text-xs text-gray-400">If the server response indicates a missing module folder, you can create it here (if supported).</div>
              <div className="flex gap-2">
                {/* Create module flow: only calls if automationApi.createModule exists */}
                {/* <button
                  onClick={async () => {
                    // If confirmModule is set (we came here from sync attempt) use it, otherwise use newModule
                    const moduleToCreate = confirmModule ?? newModule ?? "";
                    if (!moduleToCreate) {
                      showTransientToast("No module name to create");
                      return;
                    }
                    await tryCreateModuleThenSync(moduleToCreate);
                    setShowErrorModal(false);
                  }}
                  className="px-3 py-1 rounded-md bg-green-600 text-white text-sm"
                >
                  Create & Sync
                </button> */}
                <button
                  onClick={() => {
                    setShowErrorModal(false);
                    setErrorDetails(null);
                  }}
                  className="px-3 py-1 rounded-md bg-gray-200 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed right-4 bottom-6 z-50">
          <div className="bg-black text-white text-sm px-4 py-2 rounded-md shadow">{toast}</div>
        </div>
      )}
    </div>
  );
}
