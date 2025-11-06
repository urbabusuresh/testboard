"use client";
import { useEffect } from "react";
import { Card } from "@heroui/react";

export type ToastMsg = {
  id: number;
  kind: "success" | "danger" | "warning" | "default" | "confirm";
  text: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export default function ToastStack({
  items,
  onDone,
}: {
  items: ToastMsg[];
  onDone: (id: number) => void;
}) {
  useEffect(() => {
    // auto dismiss all except confirm toasts
    const timers = items
      .filter((t) => t.kind !== "confirm")
      .map((t) => setTimeout(() => onDone(t.id), 3000));
    return () => timers.forEach(clearTimeout);
  }, [items, onDone]);

  const nonConfirmToasts = items.filter((t) => t.kind !== "confirm");
  const confirmToasts = items.filter((t) => t.kind === "confirm");

  return (
    <>
      {/* ✅ Regular toast stack (top-right) */}
      <div className="fixed top-4 right-4 z-[1000] flex flex-col gap-2">
        {nonConfirmToasts.map((t) => (
          <Card
            key={t.id}
            className={`px-4 py-3 shadow-lg border ${bg(t.kind)} text-white`}
          >
            <div className="text-sm">{t.text}</div>
          </Card>
        ))}
      </div>

      {/* ✅ Center-screen confirmation alerts */}
      {confirmToasts.map((t) => (
        <div
          key={t.id}
          className="fixed inset-0 flex items-center justify-center bg-black/40 z-[1100]"
        >
          <Card
            className={`w-[360px] p-5 rounded-xl shadow-2xl text-center text-white ${bg(
              t.kind
            )}`}
          >
            <div className="text-base font-semibold mb-3">{t.text}</div>
            <div className="flex justify-center gap-3 mt-2">
              <button
                onClick={() => {
                  t.onConfirm?.();
                  onDone(t.id);
                }}
                className="px-4 py-1.5 bg-white text-red-600 font-medium rounded-md hover:bg-gray-100"
              >
                Confirm
              </button>
              <button
                onClick={() => onDone(t.id)}
                className="px-4 py-1.5 bg-white/20 text-white border border-white/40 rounded-md hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      ))}
    </>
  );
}

function bg(kind: ToastMsg["kind"]) {
  switch (kind) {
    case "success":
      return "bg-green-500";
    case "danger":
      return "bg-red-500";
    case "warning":
      return "bg-yellow-500 text-black";
    case "confirm":
      return "bg-red-600";
    default:
      return "bg-neutral-800";
  }
}
