"use client";
import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, Search } from "lucide-react";
import MemberSelector from "@/src/app/[locale]/projects/[projectId]/members/MemberSelector";

export default function TestScenarioForm({
  initial,
  onCancel,
  onSave,
}: {
  initial?: any;
  onCancel: () => void;
  onSave: (data: any) => Promise<void> | void;
}) {
  const [projectId, setProjectId] = useState("");
  const [ucSid, setUcSid] = useState("");
  const [ucId, setUcId] = useState("");
  const [tsId, setTsId] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("POSITIVE");
  const [testers, setTesters] = useState<string>(""); // comma-separated testers input

  const [checking, setChecking] = useState(false);
  const [exists, setExists] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
 const API_BASE =process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://localhost:8001";
  // Reset form when editing or adding new
  useEffect(() => {
    setProjectId(initial?.projectId ?? "");
    setUcSid(initial?.uc_sid ?? "");
    setUcId(initial?.uc_id ?? "");
    setTsId(initial?.ts_id ?? "");
    setDesc(initial?.ts_description ?? "");
    setType(initial?.ts_type ?? "POSITIVE");
    setTesters(
      Array.isArray(initial?.testers)
        ? initial?.testers.join(", ")
        : initial?.testers ?? ""
    );
    setExists(null);
    setMessage("");
  }, [JSON.stringify(initial)]);

  // 🔍 Verify if TS_ID exists
  async function handleCheckAvailability() {
    if (!tsId.trim()) {
      setMessage("⚠️ Please enter a TS ID first.");
      setExists(null);
      return;
    }

    try {
      setChecking(true);
      setMessage("");
      setExists(null);

      // ✅ Adjust your backend URL here
      const res = await fetch(`${API_BASE}/api/testusecases/testscenarios/${tsId}`);
      const data = await res.json();

      if (res.ok && typeof data.exists === "boolean") {
        setExists(data.exists);
        if (data.exists) setMessage("❌ This Test Scenario ID already exists.");
        else setMessage("✅ ID is available for use.");
      } else {
        setMessage("⚠️ Unable to verify availability.");
      }
    } catch (err) {
      console.error("Check failed:", err);
      setMessage("Error verifying availability.");
    } finally {
      setChecking(false);
    }
  }

  // 💾 Handle Save
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (exists !== false) {
      setMessage("Please verify and ensure the ID is available before saving.");
      return;
    }

    const testerArray = testers
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await onSave({
      projectId: projectId ? Number(projectId) : null,
      uc_sid: ucSid ? Number(ucSid) : null,
      uc_id: ucId || null,
      ts_id: tsId,
      ts_description: desc || null,
      ts_type: type || "POSITIVE",
      testers: testerArray,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
    >
      <h2 className="text-lg font-semibold text-gray-800 mb-2">
        {initial ? " " : "Create/Edit New Test Scenario"}
      </h2>

      {/* Project ID */}
      {/* <label className="block">
        <span className="text-xs font-semibold text-gray-600">Project ID</span>
        <input
          type="text"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full mt-1 border rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-400"
          placeholder="Enter Project ID"
        />
      </label> */}

      {/* TS_ID + Availability Check */}
      <label className="block">
        <span className="text-xs font-semibold text-gray-600">TS ID</span>
        <div className="flex items-center gap-2 mt-1">
          <input
            value={tsId}
            onChange={(e) => {
              setTsId(e.target.value);
              setExists(null);
              setMessage("");
            }}
            placeholder="Enter Test Scenario ID (e.g. TS_001)"
            className="flex-1 border rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={handleCheckAvailability}
            disabled={checking || !tsId.trim()}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md flex items-center gap-1 hover:bg-blue-700 disabled:bg-gray-300"
          >
            <Search className="w-4 h-4" />
            {checking ? "Checking..." : "Check"}
          </button>
        </div>

        {/* Availability Message */}
        {exists !== null && (
          <div
            className={`mt-2 text-sm flex items-center gap-1 ${
              exists
                ? "text-red-600 bg-red-50 px-2 py-1 rounded"
                : "text-green-700 bg-green-50 px-2 py-1 rounded"
            }`}
          >
            {exists ? (
              <XCircle className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {message}
          </div>
        )}
      </label>

      {/* Description */}
      <label className="block">
        <span className="text-xs font-semibold text-gray-600">Description</span>
        <textarea
          rows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full mt-1 border rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-400"
          placeholder="Describe the test scenario..."
        />
      </label>

      {/* Type */}
      <label className="block">
        <span className="text-xs font-semibold text-gray-600">Type</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full mt-1 border rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-400"
        >
          <option value="POSITIVE">POSITIVE</option>
          <option value="NEGATIVE">NEGATIVE</option>
          <option value="BOUNDARY">BOUNDARY</option>
        </select>
      </label>

      {/* Testers Field */}
      <label className="block">
        <span className="text-xs font-semibold text-gray-600">Testers</span>
        <MemberSelector
          projectId={Number(projectId)}
          allowMultiple={true}
          selectedMembers={testers.split(',').filter(Boolean).map(name => ({ username: name, name: name, email: '' }))}
          onChange={(members) => setTesters(members.map(m => m.username).join(','))}
        />
      </label>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 border rounded-md text-sm text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={exists !== false || checking}
          className={`px-4 py-1.5 rounded-md text-sm text-white ${
            exists === false
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Save
        </button>
      </div>
    </form>
  );
}
