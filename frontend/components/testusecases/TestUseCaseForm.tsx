"use client";
import React, { useEffect, useState, useMemo } from "react";
import { TestUseCase } from "@/types/testusecase";
import MemberSelector from "@/src/app/[locale]/projects/[projectId]/members/MemberSelector";

type Props = {
  initial?: Partial<TestUseCase>;
  projectIdval?: number | string;
  onCancel: () => void;
  onSave: (usecase: TestUseCase) => Promise<void>;
};

/**
 * TestUseCaseForm
 * - Stable controlled form for both create/edit modes.
 * - Prevents re-renders from resetting input values.
 * - Provides clean UX and reliable state updates.
 */
export default function TestUseCaseForm({ initial, projectIdval,onCancel, onSave }: Props) {
  /** Stable memoized initial values — prevents unnecessary resets */
 
  const memoInitial = useMemo(
    () => ({
      projectId: projectIdval ?? "",
      
      tm_id: initial?.tm_id ?? "",
      rd_id: initial?.rd_id ?? "",
      uc_id: initial?.uc_id ?? "",
      uc_name: initial?.uc_name ?? "",
      uc_description: initial?.uc_description ?? "",
      testers: Array.isArray(initial?.testers)
        ? initial?.testers.join(", ")
        : initial?.testers ?? "",
      status: initial?.status ?? "ACTIVE",
      tracability: initial?.tracability
        ? JSON.stringify(initial.tracability, null, 2)
        : "",
    }),
    [initial?.uc_id] // only reset when editing a different record
  );

  /** Local state */
  const [formData, setFormData] = useState(memoInitial);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  /** Sync when initial changes (e.g., user switches to another record) */
  useEffect(() => setFormData(memoInitial), [memoInitial]);

  /** Change handler */
  const handleChange = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  /** Save handler */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: TestUseCase = {
        projectId: Number(projectIdval),
        tm_id: Number(formData.tm_id),
        rd_id: Number(formData.rd_id),
         uc_sid: Number(initial?.uc_sid),
        uc_id: String(formData.uc_id),
        uc_name: formData.uc_name.trim(),
        uc_description: formData.uc_description.trim(),
        testers: formData.testers
          ? formData.testers.split(",").map((t) => t.trim())
          : [],
        status: formData.status,
        tracability: formData.tracability
          ? JSON.parse(formData.tracability)
          : {},
      };
      await onSave(payload);
    } catch (err) {
      console.error("Error saving test use case:", err);
      alert("Failed to save. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  /** Toggle advanced section */
  const toggleAdvanced = () => setShowAdvanced((s) => !s);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-6 bg-white rounded-xl shadow-md w-full max-w-2xl mx-auto"
    >
      <h2 className="text-xl font-semibold text-gray-800">
        {initial?.uc_id ? "Edit Test Use Case" : "Create New Test Use Case"}
      </h2>

      {/* Basic Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        

        <div>
          <label className="block text-sm font-medium text-gray-600">
            Use Case ID
          </label>
          <input
            type="text"
            value={formData.uc_id}
            onChange={(e) => handleChange("uc_id", e.target.value)}
            className="w-full mt-1 p-2 border rounded-md"
            readOnly={!!initial?.uc_id} // prevent editing id in edit mode
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-600">
            Use Case Name
          </label>
          <input
            type="text"
            value={formData.uc_name}
            onChange={(e) => handleChange("uc_name", e.target.value)}
            className="w-full mt-1 p-2 border rounded-md"
            required
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-600">
            Description
          </label>
          <textarea
            value={formData.uc_description}
            onChange={(e) => handleChange("uc_description", e.target.value)}
            className="w-full mt-1 p-2 border rounded-md"
            rows={3}
          />
        </div>
      </div>

      {/* Advanced Section Toggle */}
      <div className="flex justify-between items-center mt-2">
        <button
          type="button"
          onClick={toggleAdvanced}
          className="text-sm text-blue-600 hover:underline"
        >
          {showAdvanced ? "Hide Advanced Fields" : "Show Advanced Fields"}
        </button>
      </div>

      {showAdvanced && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Testers
            </label>
            <MemberSelector
              projectId={Number(projectIdval)}
              allowMultiple={true}
              selectedMembers={formData.testers.split(',').filter(Boolean).map(name => ({ username: name, name: name, email: '' }))}
              onChange={(members) => handleChange("testers", members.map(m => m.username).join(','))}
            />
          </div>

          {/* <div>
            <label className="block text-sm font-medium text-gray-600">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="DEPRECATED">DEPRECATED</option>
            </select>
          </div> */}

          {/* <div>
            <label className="block text-sm font-medium text-gray-600">
              Tracability (JSON)
            </label>
            <textarea
              value={formData.tracability}
              onChange={(e) => handleChange("tracability", e.target.value)}
              className="w-full mt-1 p-2 border rounded-md font-mono"
              rows={4}
              placeholder='e.g. { "JIRA": "PROJ-123" }'
            />
          </div> */}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className={`px-4 py-2 rounded-md text-white ${
            saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
