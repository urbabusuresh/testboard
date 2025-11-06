"use client";

import React, { useEffect, useMemo } from "react";
import { Input, Textarea } from "@heroui/react";
import {
  priorities,
  testTypes,
  automationStatus,
  testCaseIntent,
} from "@/config/selection";
import { CaseIntent, CaseType, StepType } from "@/types/testcaseModel";

// Helper: Parse step text into objects
function parseStepsText(raw: string | null | undefined): StepType[] {
  if (!raw) return [];
  const text = String(raw).trim();
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line, idx) => {
    const cleaned = line
      .replace(/^\d+\.\s*/, "")
      .replace(/^\d+\)\s*/, "");
    return { index: idx + 1, action: cleaned, expected: undefined, data: undefined };
  });
}

const safeString = (v: any) => (v === undefined || v === null ? "" : String(v));

type Props = {
  testCase: CaseType;
  setTestCase: (tc: CaseType) => void;
};

export default function BasicInfoForm({ testCase, setTestCase }: Props) {
  const parsedSteps = testCase.rawSteps;

  // Auto sync parsed steps with structured steps
  useEffect(() => {
    const currentSteps = testCase.stepsObjects ?? testCase.steps ?? [];

    if (true) {
      setTestCase({
        ...testCase,
        rawSteps: testCase.rawSteps ?? "",
      });
    }
  }, [parsedSteps]);

  // Generic update helper
  function update<K extends keyof CaseType>(key: K, value: CaseType[K]) {
    setTestCase({ ...testCase, [key]: value });
  }

  const selectBaseClass =
    "mt-1 w-full border rounded px-2 py-1 text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div>
      {/* Title */}
      <Input
        size="sm"
        variant="bordered"
        label="Title"
        value={safeString(testCase.title)}
        onChange={(e: any) => update("title", e?.target?.value ?? "")}
        className="mt-1"
      />

      {/* Description */}
      <Textarea
        size="sm"
        variant="bordered"
        label="Description"
        value={safeString(testCase.description)}
        onValueChange={(val: string) => update("description", val)}
        className="mt-1"
      />

      {/* Module + Requirement */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <Input
          size="sm"
          variant="bordered"
          label="Module / Feature"
          value={safeString(testCase.moduleName)}
          onChange={(e: any) => update("moduleName", e?.target?.value ?? "")}
          className="mt-1"
        />

        <Input
          size="sm"
          variant="bordered"
          label="Requirement ID"
          value={safeString(testCase.requirementId)}
          onChange={(e: any) => update("requirementId", e?.target?.value ?? "")}
          className="mt-1"
        />
      </div>

      {/* Select Boxes */}
      <div className="grid grid-cols-4 gap-2 mt-1">
        {/* Priority */}
        <label className="block">
          <div className="text-xs text-gray-600">Priority</div>
          <select
            className={selectBaseClass}
            value={safeString(testCase.priority)}
            onChange={(e) =>
              update(
                "priority",
                e.target.value === "" ? null : e.target.value as any
              )
            }
          >
            <option value="">— Select —</option>
            {Array.isArray(priorities) &&
              priorities.map((p: any) => (
                <option key={String(p.uid)} value={String(p.uid)}>
                  {p.uid}
                </option>
              ))}
          </select>
        </label>

        {/* Intent */}
        <label className="block">
          <div className="text-xs text-gray-600">Intent</div>
          <select
            className={selectBaseClass}
            value={safeString(testCase.caseType)}
            onChange={(e) =>
              update("caseType", e.target.value === "" ? undefined : e.target.value as CaseIntent)
            }
          >
            <option value="">— Select —</option>
            {Array.isArray(testCaseIntent) &&
              testCaseIntent.map((it: any) => (
                <option key={String(it.uid)} value={String(it.uid)}>
                  {it.uid}
                </option>
              ))}
          </select>
        </label>

        {/* Test Type */}
        <label className="block">
          <div className="text-xs text-gray-600">Test Type</div>
          <select
            className={selectBaseClass}
            value={safeString(testCase.testType)}
            onChange={(e) =>
              update("status", e.target.value === "" ? undefined : e.target.value as any)
            }
          >
            <option value="">— Select —</option>
            {Array.isArray(testTypes) &&
              testTypes.map((t: any) => (
                <option key={String(t.uid)} value={String(t.uid)}>
                  {t.uid}
                </option>
              ))}
          </select>
        </label>

        {/* Automation Status */}
        <label className="block">
          <div className="text-xs text-gray-600">Automation Status</div>
          <select
            className={selectBaseClass}
            value={safeString(testCase.automationIds)}
            onChange={(e) =>
              update(
                "automationIds",
                e.target.value === "" ? undefined : e.target.value as any
              )
            }
          >
            <option value="">— Select —</option>
            {Array.isArray(automationStatus) &&
              automationStatus.map((a: any) => (
                <option key={String(a.uid)} value={String(a.uid)}>
                  {a.uid}
                </option>
              ))}
          </select>
        </label>
      </div>

      {/* Preconditions */}
      <Textarea
        size="sm"
        variant="bordered"
        label="Preconditions"
        value={safeString(testCase.preConditions)}
        onValueChange={(val: string) => update("preConditions", val)}
        className="mt-1"
      />

      {/* Raw Steps + Expected */}
      <div className="grid grid-cols-2 gap-2 mt-1">
       <Textarea
        size="sm"
        variant="bordered"
        label="Test Data"
        value={safeString(testCase.testData)}
        onValueChange={(val: string) => update("testData", val)}
        className="mt-1"
      />

        <Textarea
          size="sm"
          variant="bordered"
          label="Expected Results"
          value={safeString(testCase.expectedResults)}
          onValueChange={(val: string) => update("expectedResults", val)}
          className="mt-1"
        />
      </div>

      {/* Test Data */}
      
    </div>
  );
}
