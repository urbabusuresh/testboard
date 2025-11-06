"use client";

import React, { useRef, useState, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { Button, Switch, Chip, Tooltip } from "@heroui/react";
import { Save, Eye, Edit3, Clock } from "lucide-react";
import { CaseMessages } from "@/types/case";

type Props = {
  isDisabled: boolean;
  initialContent?: string;
  steps: any,
  onSaveAll: (content: string) => void;
  messages: CaseMessages;
};

export default function StepsEditor({
  isDisabled,
  steps,
  initialContent = "<p>Start writing your test steps...</p>",
  onSaveAll,
  messages,
}: Props) {
  const editorRef = useRef<any>(null);
  const [content, setContent] = useState(steps?steps:initialContent);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Autosave every 10s
  useEffect(() => {
    alert(JSON.stringify(steps))
    const interval = setInterval(() => {
      if (!isDisabled && editorRef.current) triggerAutoSave();
    }, 10000);
    return () => clearInterval(interval);
  }, [isDisabled, content]);

  const triggerAutoSave = async () => {
    setSaving(true);
    const currentContent = editorRef.current?.getContent() ?? content;
    await new Promise((res) => setTimeout(res, 300)); // simulate save delay
    onSaveAll(currentContent);
    setLastSaved(new Date());
    setSaving(false);
  };

  const handleManualSave = () => {
    if (!isDisabled) triggerAutoSave();
  };

  const timeSinceLastSave = () => {
    if (!lastSaved) return "";
    const diff = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return lastSaved.toLocaleTimeString();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header Toolbar */}
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-gray-700">
          {messages.detailsOfTheStep} (Rich Editor)
        </label>
        <div className="flex items-center gap-2">
          {saving ? (
            <Chip color="warning" size="sm" variant="flat" startContent={<Clock size={14} />}>
              Saving...
            </Chip>
          ) : lastSaved ? (
            <Chip color="success" size="sm" variant="flat">
              Saved {timeSinceLastSave()}
            </Chip>
          ) : null}

          {/* <Switch
            isSelected={previewMode}
            onValueChange={setPreviewMode}
            color="primary"
            size="sm"
          >
            {previewMode ? (
              <span className="flex items-center gap-1">
                <Eye size={14} /> Preview
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Edit3 size={14} /> Edit
              </span>
            )}
          </Switch> */}

          <Tooltip content="Save Manually">
            <Button size="sm" color="primary" isDisabled={isDisabled || saving} onPress={handleManualSave}>
              <Save size={14} className="me-1" /> Save
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Editor / Preview */}
      {previewMode ? (
        <div
          className="p-4 border rounded-lg bg-gray-50 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <Editor
          tinymceScriptSrc="/tinymce/tinymce.min.js"
          onInit={(_: any, editor: any) => (editorRef.current = editor)}
          value={content}
          onEditorChange={(newContent: any) => setContent(newContent)}
          disabled={isDisabled}
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
      )}
    </div>
  );
}
