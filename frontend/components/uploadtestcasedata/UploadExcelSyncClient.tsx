"use client";
import React, { useState } from "react";
import { Spinner } from "@heroui/react";
import * as XLSX from "xlsx"; // 🆕 read Excel file
import { Download, Upload, RefreshCcw, UploadIcon, UploadCloud } from "lucide-react";

export default function UploadExcelSyncClient({
  projectId,
}: {
  projectId: number | string;
}) {
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "";
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncing, setAutomationSyncing] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [syncResult, setSyncResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 🆕 For sheet detection
  const [sheetType, setSheetType] = useState<"manual" | "automation" | null>(
    null
  );

  // 🆕 Detect Excel sheet name
  const detectSheetType = async (f: File) => {
    const buffer = await f.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetNames = workbook.SheetNames.map((s) => s.toLowerCase());
    console.log("Detected sheets:", sheetNames);

    if (sheetNames.some((n) => n.includes("automation")||n.includes("automation_tests"))) {
      
      setSheetType("automation");
    } else if (
      sheetNames.some((n) => n.includes("test_case") || n.includes("scenario"))
    ) {
      setSheetType("manual");
    } else {
      setSheetType(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setUploadResult(null);
    setSyncResult(null);
    if (f) await detectSheetType(f); // 🆕 Detect type
  };

  const handleUpload = async () => {
    if (!file || !projectId) return alert("Select a file first!");
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("project_id", String(projectId));

    try {
      const res = await fetch(`${API_BASE}/api/rawuploads/upload-excel`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }

      const data = await res.json();
      setUploadResult(data);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleSync = async () => {
    if (!uploadResult?.unique_upload_id) return alert("Upload data first!");
    setSyncing(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/rawuploads/sync-main`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          unique_upload_id: uploadResult.unique_upload_id,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Sync failed");
      }

      const data = await res.json();
      setSyncResult(data);
      
        const syncModule = await fetch(`${API_BASE}/api/rawuploads/sync-modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId,
          unique_upload_id: uploadResult.unique_upload_id,
        }),
      });

       if (!syncModule.ok) {
        const text = await syncModule.text();
        throw new Error(text || "Sync Modules failed");
      }
      
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setSyncing(false);
    }
  };

  const handleAutomationSync = async () => {
    if (!uploadResult?.unique_upload_id) return alert("Upload data first!");
    setAutomationSyncing(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/rawuploads/sync-automation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          unique_upload_id: uploadResult.unique_upload_id,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Automation Sync failed");
      }

      const data = await res.json();
      setSyncResult(data);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setAutomationSyncing(false);
    }
  };

  return (
  <div className="border rounded-lg p-5 shadow-sm bg-white">
    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
      📊 Upload & Sync Test Data
    </h2>

    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <a
          href="/templates/Sample_Test_Template.xlsx"
          download
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          <Download size={18} /> Manual Testcases Template
        </a>

        <a
          href="/templates/Automation_Tests_Template.xlsx"
          download
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          <Download size={18} /> Automation Testcases Template
        </a>
      </div>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="border p-2 rounded"
      />

      {/* 🆕 Show detected type */}
      {sheetType && (
        <div className="text-sm text-gray-700">
          📘 Detected sheet type:{" "}
          <b
            className={
              sheetType === "automation"
                ? "text-blue-700"
                : "text-green-700"
            }
          >
            {sheetType === "automation"
              ? "Automation Testcases"
              : "Manual Testcases"}
          </b>
        </div>
      )}

      {/* Upload Button */}
      <button
        disabled={!file || uploading}
        onClick={handleUpload}
        className="flex items-center justify-center gap-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {uploading ? (
          <>
            <Spinner size="sm" /> Uploading…
          </>
        ) : (
          <>
            <Upload size={18} /> Upload Excel
          </>
        )}
      </button>

 {uploadResult && (
        <div className="mt-4 border-t pt-3">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <UploadCloud size={19}/> Uploaded Raw Test Data Summary
          </h3>

          <pre className="bg-gray-50 text-gray-700 text-sm p-3 rounded border overflow-auto max-h-60">
            {JSON.stringify(uploadResult, null, 10)}
          </pre>
        </div>
      )}
      {/* ✅ Conditional Sync Buttons */}
      {sheetType === "manual" && (
        <button
          disabled={!uploadResult || syncing}
          onClick={handleSync}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {syncing ? (
            <>
              <Spinner size="sm" /> Syncing manual testcases…
            </>
          ) : (
            <>
              <RefreshCcw size={18} /> Sync Manual Tables
            </>
          )}
        </button>
      )}

      {sheetType === "automation" && (
        <button
          disabled={!uploadResult || autoSyncing}
          onClick={handleAutomationSync}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {autoSyncing ? (
            <>
              <Spinner size="sm" /> Syncing automation…
            </>
          ) : (
            <>
              <RefreshCcw size={18} /> Sync Automation Tables
            </>
          )}
        </button>
      )}
    
      {/* 🧾 Show Sync Result Summary */}
      {syncResult && (
        <div className="mt-4 border-t pt-3">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            ✅ Sync Summary
          </h3>

          <pre className="bg-gray-50 text-gray-700 text-sm p-3 rounded border overflow-auto max-h-60">
            {JSON.stringify(syncResult, null, 10)}
          </pre>
        </div>
      )}

      {/* ⚠️ Error */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
          ⚠️ {error}
        </div>
      )}
    </div>
  </div>
);

}
