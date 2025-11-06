"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Divider } from "@heroui/react";

import ModuleTable from "./ModuleTable";
import ModuleDrawer from "./ModuleDrawer";
import ModuleForm from "./ModuleForm";
import {
  listModules,
  createModule,
  updateModule,
  deleteModule,
  exportModulesCsvUrl,
} from "./api";
import { ModuleItem } from "@/types/testmodule";
import ToastStack, { ToastMsg } from "../automation/components/automation/Toast";

export default function Page({ params }: { params: any }) {
  const router = useRouter();

  const resolvedParams = React.use(params);
  const projectIdFromParams = (resolvedParams as { projectId?: string | number })?.projectId;

  const [projectId, setProjectId] = useState<string | number>(projectIdFromParams || "");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [size] = useState(25);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");

  const [items, setItems] = useState<ModuleItem[]>([]);
  const [meta, setMeta] = useState<{ total: number }>({ total: 0 });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ModuleItem | null>(null);
  const [editing, setEditing] = useState<ModuleItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // ✅ Toast state
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const pushToast = useCallback(
    (kind: ToastMsg["kind"], text: string) => {
      setToasts((prev) => [...prev, { id: Date.now(), kind, text }]);
    },
    [setToasts]
  );
  const removeToast = useCallback(
    (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    [setToasts]
  );

  // ✅ Load Modules
  async function load() {
    if (!projectId) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await listModules({ q, projectId, status, page, size, sortBy, sortDir });
      setItems(res.items || []);
      setMeta(res.meta || { total: 0 });
    } catch (err: any) {
      console.error(err);
      setError(String(err?.message || err));
      pushToast("danger", "Failed to load modules. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [q, projectId, status, page, sortBy, sortDir]);

  const handleView = (item: ModuleItem) => setSelected(item);
  const handleCloseDrawer = () => setSelected(null);
  const handleNew = () => {
    setEditing(null);
    setShowForm(true);
  };
  const handleEdit = (item: ModuleItem) => {
    setEditing(item);
    setShowForm(true);
  };

  // ✅ Delete with toast confirmation
 const handleDelete = (item: ModuleItem) => {
  setToasts((prev) => [
    ...prev,
    {
      id: Date.now(),
      kind: "confirm",
      text: `Are you sure you want to delete "${item.module}"?`,
      onConfirm: async () => {
        try {
          await deleteModule(item.tm_id);
          pushToast("success", `Module "${item.module}" deleted successfully.`);
          load();
        } catch (err: any) {
          pushToast("danger", `Delete failed: ${err?.message ?? String(err)}`);
        }
      },
    },
  ]);
};

  // ✅ Save/Create with toast feedback
  const handleSave = async (payload: Partial<ModuleItem>) => {
    try {
      const data = { ...payload, project_id: projectId };
      if (editing && editing.tm_id) {
        await updateModule(editing.tm_id, data);
        pushToast("success", `Module "${editing.module}" updated successfully.`);
      } else {
        await createModule(data);
        pushToast("success", "New module created successfully!");
      }
      setShowForm(false);
      setEditing(null);
      load();
    } catch (err: any) {
      pushToast("danger", `Save failed: ${err?.message ?? String(err)}`);
    }
  };

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / size));

  return (
    <>
      {/* ✅ Toast Overlay */}
      <ToastStack items={toasts} onDone={removeToast} />

      <div className="p-1">
        <div className="bg-blue-100 shadow-sm rounded-lg p-1">
          {/* Filters */}
          <div className="mb-3 flex flex-wrap gap-3 items-center">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 border rounded"
            >
              Prev
            </button>

            <input
              placeholder="Search module or description"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="p-2 w-64 border rounded"
            />

            <button
              onClick={() => {
                setPage(1);
                load();
              }}
              className="px-3 py-1 rounded bg-blue-600 text-white"
            >
              Search
            </button>

            <div className="ml-auto flex gap-2">
              <a
                href={exportModulesCsvUrl({ q, projectId, status })}
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
              >
                Export CSV
              </a>
              <button
                onClick={handleNew}
                className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
              >
                New Module
              </button>
            </div>

            <div className="text-sm text-gray-600">
              Total: {meta.total || 0} <br /> Page {page} / {totalPages}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 border rounded"
            >
              Next
            </button>
          </div>

          <Divider />

          {/* Table / Error / Loading */}
          {loading ? (
            <div className="p-6 bg-gray-50 rounded text-center">Loading…</div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded">{error}</div>
          ) : (
            <ModuleTable
              items={items}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {/* Pagination */}
          <div className="mt-4 flex items-center gap-2">
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
            <div className="ml-auto text-sm text-gray-600">
              Showing {items.length} items
            </div>
          </div>

          {/* Drawer */}
          {selected && (
            <ModuleDrawer
              moduleItem={selected}
              onClose={handleCloseDrawer}
              onUpdate={load}
            />
          )}

          {/* Module Form */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black opacity-30"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              />
              <div className="bg-white p-6 rounded-lg shadow-lg w-[720px] z-50">
                <h2 className="text-lg font-semibold mb-4">
                  {editing ? `Edit: ${editing.module}` : "Create Module"}
                </h2>
                <ModuleForm
                  initial={editing ?? undefined}
                  projectIdVal={projectId}
                  onCancel={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  onSave={handleSave}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
