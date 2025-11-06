"use client";

import React, { useEffect, useState } from "react";
import { TestUseCase } from "@/types/testusecase";
import MemberSelector, { ProjectMember } from "@/src/app/[locale]/projects/[projectId]/members/MemberSelector";

type Props = {
  usecase: TestUseCase;
  onClose: () => void;
  onUpdate: (uc_sid: number, payload: Partial<TestUseCase>) => Promise<TestUseCase | void>;
  onDelete?: (uc_sid: number) => Promise<void>;
  onSaved?: () => void;
};

export default function TestUseCaseDrawer({
  usecase,
  onClose,
  onUpdate,
  onDelete,
  onSaved,
}: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [local, setLocal] = useState<TestUseCase>(usecase);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [formName, setFormName] = useState<string>(usecase.uc_name ?? "");
  const [formDescription, setFormDescription] = useState<string>(usecase.uc_description ?? "");
  const [formTesters, setFormTesters] = useState<ProjectMember[]>([]);

  const [fieldError, setFieldError] = useState<{ name?: string }>({});

  useEffect(() => {
    setLocal(usecase);
    setMode("view");
    setMessage(null);
    setError(null);
    setFormName(usecase.uc_name ?? "");
    setFormDescription(usecase.uc_description ?? "");

    // If testers come from backend as array of strings
    const formatted = Array.isArray(usecase.testers)
      ? usecase.testers.map((t) => ({ userId: 0, username: t, role: 0 }))
      : [];
    setFormTesters(formatted);
  }, [usecase]);

  function validate(): boolean {
    const errs: { name?: string } = {};
    if (!formName.trim()) errs.name = "Usecase name is required.";
    setFieldError(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload: Partial<TestUseCase> = {
        uc_name: formName,
        uc_description: formDescription,
        testers: formTesters.map((m) => m.username), // send only usernames
      };

      const res = await onUpdate(local.uc_sid, payload);
      if (res) setLocal((prev) => ({ ...prev, ...(res as TestUseCase) }));
      else setLocal((prev) => ({ ...prev, ...payload }));

      setMessage("Saved successfully ✅");
      setMode("view");
      onSaved?.();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setError(String(err?.message ?? "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm("Are you sure you want to delete this use case?")) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(local.uc_sid);
      onSaved?.();
      onClose();
    } catch (err: any) {
      setError(String(err?.message ?? "Delete failed"));
    } finally {
      setDeleting(false);
    }
  }

  const FloatingInput = ({
    label,
    value,
    onChange,
    textarea = false,
    error,
  }: {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    textarea?: boolean;
    error?: string;
  }) => (
    <div className="relative w-full">
      {textarea ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder=" "
          rows={4}
          className={`block w-full rounded-md border px-3 pt-5 pb-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 peer ${
            error ? "border-red-500" : "border-gray-300"
          }`}
        />
      ) : (
        <input
          value={value}
          onChange={onChange}
          placeholder=" "
          className={`block w-full rounded-md border px-3 pt-5 pb-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 peer ${
            error ? "border-red-500" : "border-gray-300"
          }`}
        />
      )}
      <label className="absolute left-3 top-2 text-gray-500 text-sm transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-600">
        {label}
      </label>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/40" onClick={() => onClose()} aria-hidden />

      {/* Drawer */}
      <aside className="w-[640px] max-w-full bg-white shadow-2xl p-6 overflow-auto rounded-l-lg">
        {/* Header */}
        <header className="flex items-start justify-between border-b pb-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {local.uc_name ?? "New Use Case"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              ID: {local.uc_sid} • Project {local.projectId}
            </p>
          </div>

          <div className="flex gap-2">
            {mode === "view" ? (
              <button
                onClick={() => setMode("edit")}
                className="px-3 py-1 text-sm rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                Edit
              </button>
            ) : (
              <button
                onClick={() => setMode("view")}
                className="px-3 py-1 text-sm rounded border text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            {onDelete && mode === "view" && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1 text-sm rounded bg-red-50 text-red-700 hover:bg-red-100"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm rounded border text-gray-500 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </header>

        {/* Notifications */}
        {message && (
          <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded mb-3">
            {message}
          </div>
        )}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded mb-3">
            {error}
          </div>
        )}

        {/* View Mode */}
        {mode === "view" && (
          <div className="space-y-6">
            <div>
              <div className="text-xs text-gray-500 font-semibold mb-1">
                Description
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">
                {local.uc_description ?? "—"}
              </p>
            </div>

            <div>
              <div className="text-xs text-gray-500 font-semibold mb-1">
                Testers
              </div>
              <p className="text-gray-800">
                {Array.isArray(local.testers)
                  ? local.testers.join(", ")
                  : local.testers ?? "—"}
              </p>
            </div>

            <div>
              <button
                className="text-sm text-blue-600 hover:underline"
                onClick={() => setAdvancedOpen(!advancedOpen)}
              >
                {advancedOpen ? "Hide Metadata" : "Show Metadata"}
              </button>

              {advancedOpen && (
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded mt-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Module</div>
                    <div>{local.module ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Reference doc</div>
                    <div>{local.rd_id ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Created</div>
                    <div>
                      {local.createdAt
                        ? new Date(local.createdAt).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Updated</div>
                    <div>
                      {local.updatedAt
                        ? new Date(local.updatedAt).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Mode */}
        {mode === "edit" && (
          <div className="space-y-5">
            <FloatingInput
              label="Usecase Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              error={fieldError.name}
            />
            <FloatingInput
              label="Description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              textarea
            />

            {/* 👥 Member Selector for Testers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign Testers
              </label>
              <MemberSelector
                projectId={local.projectId}
                roles={[1, 2, 3]}
                allowMultiple
                selectedMembers={formTesters} // ✅ prefill
                onChange={(members) => setFormTesters(members)}
              />
              {formTesters.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {formTesters.map((m) => m.username).join(", ")}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setMode("view")}
                className="px-3 py-1 border rounded text-sm"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
