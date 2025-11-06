"use client";

import React, { useState, useMemo } from "react";
import { Tooltip } from "@heroui/react";
import {
  EditIcon,
  Trash2Icon,
  ViewIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowUpRightFromSquare,
} from "lucide-react";
import { TestCase } from "@/types/testcase";
import DrawerCaseEditor from "@/src/app/[locale]/projects/[projectId]/testcases/[testcaseId]/DrawerCaseEditor";

type Props = {
  items: TestCase[] | any[];
  locale?: string;
  projectId?: string | number;
  tsCodeProp?: string;
  onView?: (tc: any) => void;
  onEdit?: (tc: any) => void;
  onDelete?: (tc: any) => void;
  buildId?: any;
};

export default function TestCaseTable({
  items,
  locale = "en",
  projectId = "",
  tsCodeProp = "all",
  onView,
  onEdit,
  onDelete,
  buildId,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<any | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const openDrawer = (tc: any) => {
    setSelectedTestCase(tc);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedTestCase(null);
  };

  const openInNewTab = (tc: any) => {
    const id = tc.tc_sid ?? tc.tc_id;
    const url = `/${locale}/projects/${projectId}/testcases/${id}?buildId=${buildId}&ts=${tsCodeProp}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const sortedItems = useMemo(() => {
    if (!sortConfig) return items;
    return [...items].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal == null || bVal == null) return 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [items, sortConfig]);

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key !== key)
      return (
        <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 ml-1 transition-all" />
      );
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-blue-600 ml-1" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-blue-600 ml-1" />
    );
  };

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-xl shadow border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          {/* ==== TABLE HEADER ==== */}
          <thead className="bg-gray-50 text-gray-700 font-medium sticky top-0 z-10 shadow-sm">
            <tr>
              {[
                { key: "tc_sid", label: "Id" },
                { key: "tc_id", label: "Testcase" },
                { key: "module", label: "Module" },
                { key: "tc_type", label: "Type" },
                { key: "tc_description", label: "Description" },
                { key: "status", label: "Status" },
                { key: "spoc", label: "Spoc" },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left cursor-pointer select-none hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-1">
                    <span className="group-hover:text-blue-600 transition-colors">
                      {col.label}
                    </span>
                    {renderSortIcon(col.key)}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-left w-52">Actions</th>
            </tr>
          </thead>

          {/* ==== TABLE BODY ==== */}
          <tbody className="divide-y divide-gray-100">
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  No testcases found
                </td>
              </tr>
            ) : (
              sortedItems.map((tc, index) => (
                <tr
                  key={tc.tc_sid ?? tc.tc_id ?? index}
                  className="hover:bg-blue-100 even:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => openDrawer(tc)}
                >
                  <td className="px-4 py-2">{tc.tc_sid}</td>
                  <td className="px-4 py-2">
                    <span className="font-semibold text-blue-600 hover:underline">
                      {tc.tc_id}
                    </span>
                    <br />
                    <small className="text-gray-500">
                      <Tooltip
                        content={tc.ts_description}
                        placement="bottom"
                        showArrow
                        color="primary"
                      >
                        {tc.ts_id}
                      </Tooltip>
                    </small>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{tc.module}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        "font-medium " +
                        (tc.tc_type?.trim() === "Positive"
                          ? "text-green-600"
                          : tc.tc_type?.trim() === "Negative"
                          ? "text-red-600"
                          : "text-gray-600")
                      }
                    >
                      {tc.tc_type}
                    </span>
                  </td>
                  <td className="px-4 py-2 truncate max-w-[280px] text-gray-700">
                    {tc.tc_description ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{tc.status ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-700">{tc.spoc ?? "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 items-center">
{Number(buildId) > 0 && (
  <div className="relative inline-block group">
    {/* 🟩 Status Badge */}
    <span
      className={`px-2 py-1 rounded-full text-[11px] font-medium cursor-pointer ${
        tc.execution_state === -1
          ? "bg-orange-100 text-orange-700"
          : tc.execution_state === 0
          ? "bg-gray-100 text-gray-600"
          : tc.execution_state === 1
          ? "bg-blue-100 text-blue-700"
          : tc.execution_state === 2
          ? "bg-yellow-100 text-yellow-700"
          : tc.execution_state === 3
          ? "bg-purple-100 text-purple-700"
          : tc.execution_state === 4
          ? "bg-green-100 text-green-700"
          : "bg-gray-50 text-gray-500"
      }`}
    >
      {tc.cycle_number ? `${tc.cycle_number}. ` : ""}
      {(() => {
        switch (tc.execution_state) {
          case -1:
            return "Retest";
          case 0:
            return "Initiated";
          case 1:
            return "Review";
          case 2:
            return "Under Review";
          case 3:
            return "Approval";
          case 4:
            return "Completed";
          default:
            return "Not Tested";
        }
      })()}
    </span>

    {/* 🧠 Tooltip Card (Above) */}
    <div className="absolute z-50 hidden group-hover:block bg-white border border-gray-200 shadow-lg rounded-md text-xs text-gray-700 p-2 w-52 left-1/2 -translate-x-1/2 bottom-8 transition-all duration-200 ease-in-out opacity-0 group-hover:opacity-100">
      {/* 🔼 Arrow Pointer */}
      <div className="absolute left-1/2 -bottom-2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-l-transparent border-r-6 border-r-transparent border-t-6 border-t-white"></div>

      <div className="font-semibold text-gray-800 mb-1">Execution Info</div>
      <div><span className="font-medium">Execution ID:</span> {tc.execution_id ?? "—"}</div>
      <div><span className="font-medium">Cycle Number:</span> {tc.cycle_number ?? "—"}</div>
      <div><span className="font-medium">Started Date:</span> {tc.execution_id ? new Date(tc.execution_id).toLocaleString() : "—"}</div>
    </div>
  </div>
)}




                      {/* 👁 Inline Drawer */}
                      <Tooltip content="Quick View (Drawer)">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(tc);
                          }}
                          className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition"
                        >
                          <ViewIcon className="h-4 w-4" />
                        </button>
                      </Tooltip>

                      {/* 🧭 Open in New Tab */}
                      <Tooltip content="Open in New Tab">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openInNewTab(tc);
                          }}
                          className="p-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition"
                        >
                          <ArrowUpRightFromSquare className="h-4 w-4" />
                        </button>
                      </Tooltip>

                     

                      {/* 🗑 Delete */}
                      <Tooltip content="Delete Test Case">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(tc);
                          }}
                          className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </button>
                      </Tooltip>

                      
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ==== DRAWER SECTION ==== */}
      {selectedTestCase && (
        <DrawerCaseEditor
          isOpen={drawerOpen}
          onClose={closeDrawer}
          projectId={projectId}
          caseId={selectedTestCase.tc_sid ?? selectedTestCase.tc_id}
          testScenarioId={tsCodeProp}
          buildId={buildId}
          locale={locale}
          messages={{
            backToCases: "Back to Cases",
            updating: "Updating...",
            update: "Update",
            updatedTestCase: "Testcase Updated!",
          }}
        />
      )}
    </>
  );
}
