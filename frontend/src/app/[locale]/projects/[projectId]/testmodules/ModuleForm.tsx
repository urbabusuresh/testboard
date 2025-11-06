"use client";
import React, { useEffect, useState } from "react";
import { ModuleItem } from "@/types/testmodule";
import MemberSelector, { ProjectMember } from "../members/MemberSelector";

type Props = {
  initial?: Partial<ModuleItem>;
  projectIdVal: number | string;
  onCancel: () => void;
  onSave: (payload: Partial<ModuleItem>) => Promise<void>;
};

export default function ModuleForm({
  initial = {},
  projectIdVal,
  onCancel,
  onSave,
}: Props) {
  const [projectId, setProjectId] = useState<number | string>(
    initial.projectId ?? projectIdVal ?? ""
  );
  const [moduleName, setModuleName] = useState(initial.module ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [status, setStatus] = useState(initial.status ?? "");
  const [saving, setSaving] = useState(false);

  // Members
  const [selectedTesters, setSelectedTesters] = useState<ProjectMember[]>([]);
  const [selectedDevelopers, setSelectedDevelopers] = useState<ProjectMember[]>([]);

  // ✅ Initialize existing data in edit mode
  useEffect(() => {
    if (initial && Object.keys(initial).length > 0) {
      setProjectId(initial.projectId ?? projectIdVal ?? "");
      setModuleName(initial.module ?? "");
      setDescription(initial.description ?? "");
      setStatus(initial.status ?? "");

      try {
        // Parse testers (string or array)
        if (typeof initial.testers === "string" && initial.testers.trim()) {
          const testersArr = initial.testers
            .split(",")
            .map((u) => u.trim())
            .filter(Boolean);
          setSelectedTesters(
            testersArr.map((u, i) => ({ userId: i + 1, username: u, role: 0 }))
          );
        } else if (Array.isArray(initial.testers)) {
          setSelectedTesters(
            initial.testers.map((u: any, i: number) => ({
              userId: u.userId ?? i + 1,
              username: u.username ?? u,
              role: u.role ?? 0,
            }))
          );
        }

        // Parse developers (string or array)
        if (typeof initial.developers === "string" && initial.developers.trim()) {
          const devsArr = initial.developers
            .split(",")
            .map((u) => u.trim())
            .filter(Boolean);
          setSelectedDevelopers(
            devsArr.map((u, i) => ({ userId: i + 1, username: u, role: 0 }))
          );
        } else if (Array.isArray(initial.developers)) {
          setSelectedDevelopers(
            initial.developers.map((u: any, i: number) => ({
              userId: u.userId ?? i + 1,
              username: u.username ?? u,
              role: u.role ?? 0,
            }))
          );
        }
      } catch (err) {
        console.warn("Failed to parse existing members", err);
      }
    }
  }, [initial?.tm_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const testersStr = selectedTesters.map((m) => m.username).join(", ");
      const developersStr = selectedDevelopers.map((m) => m.username).join(", ");

      const payload: Partial<ModuleItem> = {
        projectId: Number(projectId),
        module: moduleName,
        description: description || null,
        testers: testersStr || null, // ✅ Comma-separated string
        developers: developersStr || null, // ✅ Comma-separated string
        status: status || null,
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-1 space-y-4 max-w-4xl mx-auto rounded-xl shadow-sm"
    >
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Module Name <span className="text-red-500">*</span>
        </label>
        <input
          required
          value={moduleName}
          onChange={(e) => setModuleName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter module name"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Brief description of the module..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Testers
          </label>
          <MemberSelector
            projectId={Number(projectId)}
            roles={[1, 2, 3, 4, 5, 6, 7]}
            allowMultiple={true}
            onChange={setSelectedTesters}
            selectedMembers={selectedTesters} // ✅ prefill
          />
          {selectedTesters.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Selected: {selectedTesters.map((m) => m.username).join(", ")}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Developers
          </label>
          <MemberSelector
            projectId={Number(projectId)}
            roles={[1, 2, 3, 4, 5, 6, 7]}
            allowMultiple={true}
            onChange={setSelectedDevelopers}
            selectedMembers={selectedDevelopers} // ✅ prefill
          />
          {selectedDevelopers.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Selected: {selectedDevelopers.map((m) => m.username).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div> */}

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-white font-semibold ${
            saving
              ? "bg-blue-400 cursor-wait"
              : "bg-blue-600 hover:bg-blue-700 transition"
          }`}
        >
          {saving ? "Saving..." : "Save Module"}
        </button>
      </div>
    </form>
  );
}
