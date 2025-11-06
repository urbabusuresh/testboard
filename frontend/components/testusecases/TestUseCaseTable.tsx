"use client";

import React, { useState, useRef, useEffect } from "react";
import { TestUseCase } from "@/types/testusecase";
import { Edit, Trash2, FileText, PlusCircleIcon, MoreVertical } from "lucide-react";

type Props = {
  items: TestUseCase[];
  onView: (m: TestUseCase) => void;
  viewTestScenarios: (m: TestUseCase) => void;
  onEdit: (m: TestUseCase) => void;
  onDelete: (m: TestUseCase) => void;
  onCreateScenario: (uc: TestUseCase) => void;
};

export default function TestUseCaseTable({
  items,
  viewTestScenarios,
  onView,
  onEdit,
  onDelete,
  onCreateScenario,
}: Props) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const menuRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // ✅ Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedInside = Object.values(menuRefs.current).some(
        (ref) => ref && ref.contains(event.target as Node)
      );
      if (!clickedInside) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Open a new tab for "View Scenarios"
  
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-800">
        <thead className="bg-gray-50">
          <tr>
            {["ID", "Use Case ID", "Name", "Module", "Scenarios", "Testcases", "Actions"].map(
              (h) => (
                <th
                  key={h}
                  className={`px-3 py-2 ${
                    h === "Actions" ? "text-right" : "text-left"
                  } text-xs font-semibold text-gray-600 uppercase tracking-wide`}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-6 text-center text-gray-500">
                No test use cases found
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr
                key={item.uc_sid}
                className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 transition-colors"
              >
                <td className="px-3 py-2 text-gray-700">#{item.uc_sid}</td>
                <td className="px-3 py-2 text-blue-700 font-medium cursor-pointer hover:underline">
                  {item.uc_id}
                </td>
                <td className="px-3 py-2">{item.uc_name || "—"}</td>
                <td className="px-3 py-2">{item.module || "—"}</td>

                {/* ✅ Scenario Count clickable to open scenarios page */}
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => viewTestScenarios(item)}
                    className="text-blue-600 hover:underline hover:text-blue-800 font-medium"
                    title="View Scenarios"
                  >
                    {item.scenariosCount ?? 0}
                  </button>
                </td>

                <td className="px-3 py-2 text-center">{item.testcasesCount ?? 0}</td>

                {/* ✅ Actions Menu */}
                <td className="px-3 py-2 text-right relative">
                  <div ref={(el) => (menuRefs.current[item.uc_sid] = el)} className="relative">
                    <button
                      onClick={() =>
                        setOpenMenu(openMenu === item.uc_sid ? null : item.uc_sid)
                      }
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                      title="More actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {openMenu === item.uc_sid && (
                      <div
                        className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ul className="py-1 text-sm text-gray-700">
                          <li>
                            <button
                              onClick={() => {
                                onCreateScenario(item);
                                setOpenMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-green-600"
                            >
                              <PlusCircleIcon className="h-4 w-4" />
                              Create Scenario
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => {
                                viewTestScenarios(item);
                                setOpenMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-orange-600"
                            >
                              <FileText className="h-4 w-4" />
                              View Scenarios
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => {
                                onView(item);
                                setOpenMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-amber-600"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => {
                                onDelete(item);
                                setOpenMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
