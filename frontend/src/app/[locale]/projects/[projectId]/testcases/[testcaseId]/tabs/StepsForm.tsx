"use client";

import React, { useRef, useState, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { Button, Chip, Tooltip } from "@heroui/react";
import { Save, Clock } from "lucide-react";
import { CaseType } from "@/types/testcaseModel";

type Props = {
  testCase: CaseType;
  setTestCase: (tc: CaseType) => void;
  messages?: { steps?: string };
};

export default function StepsForm({ testCase, setTestCase, messages }: Props) {
  const editorRef = useRef<any>(null);
  const [content, setContent] = useState(testCase.rawSteps ?? "");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Keeps last saved content snapshot
  const lastSavedContentRef = useRef(content);

  // ---------- Helpers ----------
  const htmlToPlainSteps = (html: string) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const listItems = Array.from(tempDiv.querySelectorAll("li"));
    if (listItems.length > 0) {
      return listItems
        .map(li => li.textContent?.trim() ?? "")
        .filter(Boolean)
        .join("\n");
    }
    return tempDiv.textContent?.trim() ?? "";
  };

  const persistContent = (htmlContent: string) => {
    const rawSteps = htmlToPlainSteps(htmlContent);
    setTestCase({ ...testCase, rawSteps });
  };

  // ---------- Core Save Logic ----------
  const triggerAutoSave = async () => {
    if (!editorRef.current) return;

    const currentContent = editorRef.current.getContent() ?? "";

    // Skip if nothing changed
    if (currentContent === lastSavedContentRef.current) return;

    setSaving(true);
    await new Promise(res => setTimeout(res, 200)); // simulate save delay

    persistContent(currentContent);
    lastSavedContentRef.current = currentContent;
    setLastSaved(new Date());
    setSaving(false);
  };

  // ---------- Debounced Auto-Save (3 sec after typing stops) ----------
  useEffect(() => {
    const timeout = setTimeout(() => {
      triggerAutoSave();
    }, 3000);
    return () => clearTimeout(timeout);
  }, [content]); // run debounce on every content change

  // ---------- Periodic Safety Auto-Save (every 20 sec) ----------
  useEffect(() => {
    const interval = setInterval(() => {
      triggerAutoSave();
    }, 20000);
    return () => clearInterval(interval);
  }, []); // stable, runs continuously

  const handleManualSave = () => {
    triggerAutoSave();
  };

  // ---------- Display Save Status ----------
  const timeSinceLastSave = () => {
    if (!lastSaved) return "";
    const diff = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return lastSaved.toLocaleTimeString();
  };

  // ---------- UI ----------
  return (
    <div className="flex flex-col gap-3 mb-3">
      {/* Header */}
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-gray-700">
          {messages?.steps ?? "Test Steps"} (Rich Editor)
        </label>
        <div className="flex items-center gap-2">
          {saving ? (
            <Chip
              color="warning"
              size="sm"
              variant="flat"
              startContent={<Clock size={14} />}
            >
              Saving…
            </Chip>
          ) : lastSaved ? (
            <Chip color="success" size="sm" variant="flat">
              Saved {timeSinceLastSave()}
            </Chip>
          ) : null}

          <Tooltip content="Save Manually">
            <Button size="sm" color="primary" onPress={handleManualSave}>
              <Save size={14} /> Save
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* TinyMCE Editor */}
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        onInit={(_: any, editor: any) => (editorRef.current = editor)}
        value={content}
        onEditorChange={(newContent: string) => setContent(newContent)}
        init={{
          license_key: "gpl",
          height: 500,
          menubar: true,
          plugins:
            "advlist autolink lists link image charmap preview anchor " +
            "searchreplace code fullscreen insertdatetime media table help wordcount",
          toolbar:
            "undo redo | formatselect | bold italic underline strikethrough forecolor backcolor | " +
            "alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | " +
            "table image link media | removeformat | help",
          skin_url: "/tinymce/skins/ui/oxide",
          content_css: "/tinymce/skins/content/default/content.css",
        }}
      />
    </div>
  );
}
