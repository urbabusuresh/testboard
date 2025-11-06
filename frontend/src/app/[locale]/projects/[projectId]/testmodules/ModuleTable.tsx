import React from "react";
import { ModuleItem } from "@/types/testmodule";
import { EyeIcon, Trash2Icon } from "lucide-react";

type Props = {
  items: ModuleItem[];
  onView: (m: ModuleItem) => void;
  onEdit: (m: ModuleItem) => void;
  onDelete: (m: ModuleItem) => void;
};

export default function ModuleTable({ items, onView, onEdit, onDelete }: Props) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-100">
      <table className="min-w-full text-sm text-gray-800">
        {/* ✅ Table Header */}
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            {[
              "ID",
              "Module",
              "Description",
              "Usecases",
              "Scenarios",
              "Testcases",
              "Testers",
              "Updated",
              "Actions",
            ].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 tracking-wide border-b border-gray-200"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        {/* ✅ Table Body */}
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                className="p-8 text-center text-gray-500 text-base"
              >
                No test modules found
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr
                key={item.tm_id}
                className={`${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-blue-50 transition-colors`}
              >
                {/* ID */}
                <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">
                  #{item.tm_id}
                </td>

                {/* Module */}
                <td className="px-4 py-3 font-medium text-blue-700">
                  <button
                    onClick={() => onView(item)}
                    className="hover:underline hover:text-blue-800"
                  >
                    {item.module}
                  </button>
                </td>

                {/* Description */}
                <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
                  {item.description ?? "—"}
                </td>

                {/* Usecases */}
                <td className="px-4 py-3 text-center font-medium text-gray-700">
                  {item.usecases ?? 0}
                </td>

                {/* Scenarios */}
                <td className="px-4 py-3 text-center font-medium text-gray-700">
                  {item.scenarios ?? 0}
                </td>

                {/* Testcases */}
                <td className="px-4 py-3 text-center font-medium text-gray-700">
                  {item.testcases ?? 0}
                </td>

                {/* Testers */}
                <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-md">
                  {item.testers ?? "—"}
                </td>

                {/* Updated */}
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {item.updatedAt
                    ? new Date(item.updatedAt).toLocaleString()
                    : "—"}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onView(item)}
                      title="View/Edit Module"
                      className="px-2 py-1 rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200 flex items-center justify-center"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      title="Delete Module"
                      className="px-2 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </button>
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
