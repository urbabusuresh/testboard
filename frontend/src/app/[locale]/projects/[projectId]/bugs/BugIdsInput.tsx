'use client';
import { useMemo, useState } from "react";
import { Input, Chip, Button, Tooltip, addToast } from "@heroui/react";
import { bugzillaApi } from "./service/bugzillaApi";

type Props = {
  label?: string;
  value: string; // comma-separated bug IDs, e.g. "123,456"
  onChange: (next: string) => void; // parent receives updated CSV string
  placeholder?: string;
  disabled?: boolean;
};

export default function BugIdsInput({
  label = "Bug IDs",
  value,
  onChange,
  placeholder = "Type a bug ID and press Enter (paste supports commas)",
  disabled,
}: Props) {
  const [input, setInput] = useState("");

  // Convert CSV → unique cleaned list
  const parsedIds = useMemo(() => {
    if (!value) return [] as string[];
    const tokens = value
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of tokens) {
      const key = t.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(t);
      }
    }
    return out;
  }, [value]);

  // --- Helper: add one ID after checking validity ---
  const tryAddSingle = async (raw: string) => {
    const id = raw.trim();
    if (!id) return;
    const lower = id.toLowerCase();

    if (parsedIds.some((p) => p.toLowerCase() === lower)) {
      addToast({ title: "Duplicate", description: `${id} already added`, color: "warning" });
      return;
    }

    try {
      const exists = await bugzillaApi.checkBugExists(id);
      if (!exists) {
        addToast({
          title: "Not Found",
          description: `Bug ${id} does not exist in Bugzilla`,
          color: "danger",
        });
        return;
      }

      const nextCsv = [...parsedIds, id].join(","); // always store as CSV
      onChange(nextCsv);
    } catch (e: any) {
      addToast({
        title: "Error",
        description: e?.message ?? "Bug validation failed",
        color: "danger",
      });
    }
  };

  // --- Handle Enter/comma/paste ---
  const handleCommitInput = async () => {
    const tokens = input.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
    setInput("");
    for (const t of tokens) {
      // validate one by one for consistent UX
      // eslint-disable-next-line no-await-in-loop
      await tryAddSingle(t);
    }
  };

  // --- Remove one bug ID ---
  const removeId = (id: string) => {
    const next = parsedIds
      .filter((p) => p.toLowerCase() !== id.toLowerCase())
      .join(",");
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <Input
          size="sm"
          label={label}
          placeholder={placeholder}
          value={input}
          isDisabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              await handleCommitInput();
            }
          }}
          onBlur={async () => {
            if (input.trim()) await handleCommitInput();
          }}
        />
        <Button
          size="sm"
          variant="flat"
          isDisabled={disabled || !input.trim()}
          onPress={handleCommitInput}
        >
          Add
        </Button>
      </div>

      {/* Chips for added bug IDs */}
      <div className="flex flex-wrap gap-2">
        {parsedIds.map((id) => (
          <Tooltip key={id} content={`Bug ${id}`}>
            <Chip
              color="default"
              variant="flat"
              onClose={() => removeId(id)}
              className="cursor-pointer"
            >
              {id}
            </Chip>
          </Tooltip>
        ))}
        {parsedIds.length === 0 && (
          <span className="text-xs text-neutral-500">No bugs added</span>
        )}
      </div>
    </div>
  );
}
