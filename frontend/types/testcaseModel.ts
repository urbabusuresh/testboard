// src/types/testcaseModel.ts

export type StepType = {
  index: number;
  action: string;
  expected?: string | null;
  data?: any | null;
};

export type RunCaseType = {
  runId?: number;
  executedBy?: string | null;
  executedAt?: string | null; // ISO string
  status?: string | null;
  notes?: string | null;
};

export type AttachmentType = {
  id: string;
  name?: string | null;
  link?: string | null;
  uploadedAt?: string | null; // ISO
};

export enum CaseStatus {
  Pass = "Pass",
  Fail = "Fail",
  Blocked = "Blocked",
  NotRun = "NotRun",
  Skipped = "Skipped",
  Unknown = "Unknown",
  Deferred = "Deferred",
  Destructive = "Destructive",
  Enhancement = "Enhancement",
  InProgress = "In Progress",
  IntegrationRequired = "Integration Required",
  NoFunctionality = "No Functionality",
  NoRequirement = "No Requirement",
  NotImplemented = "Not Implemented",
  NotStarted = "Not Started",
  OnHold = "On Hold",
  OutOfScope = "Out of Scope",
}


export enum CaseIntent {
  Positive = "Positive",
  Negative = "Negative",
}

/**
 * Canonical test case model similar to the example you provided.
 * Fields are camelCased and optional where appropriate.
 */
export type CaseType = {
  // primary identifiers
  id: number;            // maps to tc_sid
  externalId: string;    // maps to tc_id (human id)
  projectId?: number;
  
  // scenario mapping
  scenarioId?: number | null;  // ts_sid
  scenarioExternalId?: string | null; // ts_id

  // human-friendly title/description
  title?: string | null;       // uc_name / short title (we'll use tc_description if no separate title)
  description?: string | null; // tc_description

  // classification
  caseType?: string;       // tc_type => CaseIntent enum
  priority?: number | string | null;    // optional numeric priority
  testType?:string;
  // lifecycle / state
  status?: CaseStatus;
  spoc?: string | null;        // owner
  bugId?: string | null;
  link?: string | null;        // pot_link or related link

  // test content
  preConditions?: string | null; // prerequisites
  steps?: StepType[];            // parsed steps
  rawSteps?: string | null;      // original steps string
  testData?: any | null;         // tc_data
  expectedResults?: any | null;  // expected_results
  actualResult?: any | null;     // actual_result

  // metadata
  iteration?: string | null;
  remarks?: string | null;
  count?: string | null;
  traceability?: any | null;
  testers?: string[] | null;     // testers array
  createdAt?: string | null;     // ISO
  updatedAt?: string | null;     // ISO
  deletedAt?: string | null;     // ISO

  // relations & attachments
  stepsObjects?: StepType[];        // alias for steps
  runCases?: RunCaseType[] | null;
  attachments?: AttachmentType[] | null;

  // UI / runtime
  isIncluded?: boolean;
  runStatus?: string | number | null;

  // automation & requirements
  automationIds?: string[];   // IDs of automation scripts
  requirementId?: string | null;

  // module/feature
  moduleName?: string | null;
};

/**
 * TestCase class to convert API response into CaseType and helper methods
 */
export class TestCase {
  public data: CaseType;

  private constructor(data: CaseType) {
    this.data = data;
  }

  /**
   * Parse the API response (your example JSON) into CaseType
   */
  static fromApi(api: any): TestCase {
    // safe extraction helpers
    const toNumberOrUndefined = (v: any) => (v === null || v === undefined ? undefined : Number(v));
    const toStringOrNull = (v: any) => (v === undefined ? null : v === null ? null : String(v));
    const parseTesters = (t: any) => {
      if (!t) return null;
      if (Array.isArray(t)) return t.map(String);
      try {
        return JSON.parse(String(t));
      } catch {
        return String(t).split(",").map((s) => s.trim()).filter(Boolean);
      }
    };

    // parse steps string into StepType[] (simple heuristic: split on newlines and numberings)
    function parseStepsText(raw: any): StepType[] {
      if (!raw && raw !== "") return [];
      const text = String(raw || "").trim();
      if (!text) return [];
      // split by newline and remove empty lines
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      // if lines look like numbered steps (1. or 1) remove leading numbering
      const steps: StepType[] = lines.map((line, idx) => {
        const cleaned = line.replace(/^\d+\.\s*/, "").replace(/^\d+\)\s*/, "");
        return { index: idx + 1, action: cleaned, expected: undefined, data: undefined };
      });
      return steps;
    }

    // map tc_type to CaseIntent
    function mapCaseIntent(tf: any): CaseIntent | undefined {
      if (!tf) return undefined;
      const t = String(tf).toLowerCase();
      if (t.includes("pos")) return CaseIntent.Positive;
      if (t.includes("neg")) return CaseIntent.Negative;
      
    }

    // map status
    function mapStatus(s: any): CaseStatus {
      if (!s) return CaseStatus.Unknown;
      const ss = String(s).toLowerCase();
      if (ss === "pass" || ss === "passed" || ss === "ok") return CaseStatus.Pass;
      if (ss === "fail" || ss === "failed") return CaseStatus.Fail;
      if (ss === "blocked") return CaseStatus.Blocked;
      if (ss === "skipped") return CaseStatus.Skipped;
      if (ss === "notrun" || ss === "not run") return CaseStatus.NotRun;
      return CaseStatus.Unknown;
    }

    // Build CaseType
    const c: CaseType = {
      id: toNumberOrUndefined(api.tc_sid) ?? 0,
      externalId: toStringOrNull(api.tc_id) ?? `TC_${api.tc_sid ?? "0"}`,
      projectId: toNumberOrUndefined(api.projectId),
      scenarioId: toNumberOrUndefined(api.ts_sid) ?? undefined,
      scenarioExternalId: toStringOrNull(api.ts_id),
      title: toStringOrNull(api.tc_description) ? String(api.tc_description).slice(0, 120) : null,
      description: toStringOrNull(api.tc_description),
      caseType: mapCaseIntent(api.tc_type),
      status: mapStatus(api.status ?? api.result ?? api.testResult),
      spoc: toStringOrNull(api.spoc),
      bugId: toStringOrNull(api.bug_id),
      link: toStringOrNull(api.pot_link),
      preConditions: toStringOrNull(api.prerequisites),
      rawSteps: toStringOrNull(api.steps),
      steps: parseStepsText(api.steps),
      testData: api.tc_data ?? null,
      expectedResults: api.expected_results ?? null,
      actualResult: api.actual_result ?? null,
      iteration: toStringOrNull(api.Iteration),
      remarks: toStringOrNull(api.remarks),
      count: toStringOrNull(api.count),
      traceability: api.tracability ?? null,
      testers: parseTesters(api.testers),
      createdAt: toStringOrNull(api.createdAt),
      updatedAt: toStringOrNull(api.updatedAt),
      deletedAt: toStringOrNull(api.deletedAt),
      runCases: null,
      attachments: null,
      isIncluded: true,
      runStatus: null,
      automationIds: [],
      requirementId: null,
      moduleName: null,
    };

    // alias
    c.stepsObjects = c.steps;

    return new TestCase(c);
  }

  // convenience to get plain object
  toJSON(): CaseType {
    return { ...this.data };
  }

  // small helper to update steps (keeps rawSteps in sync)
  updateStepsFromArray(steps: StepType[]) {
    this.data.steps = steps;
    this.data.stepsObjects = steps;
    this.data.rawSteps = steps.map((s) => s.action).join("\n");
  }

  // convenience to update state/status
  setStatus(status: CaseStatus | string) {
    if (typeof status === "string") {
      // try map to enum
      const up = (status as string).toLowerCase();
      if (up === "pass") this.data.status = CaseStatus.Pass;
      else if (up === "fail") this.data.status = CaseStatus.Fail;
      else if (up === "blocked") this.data.status = CaseStatus.Blocked;
      else this.data.status = CaseStatus.Unknown;
    } else {
      this.data.status = status;
    }
  }
}

/* Example usage:

import { TestCase } from "@/types/testcaseModel";

const api = { ... } // the JSON you pasted
const model = TestCase.fromApi(api);
console.log(model.data);
*/

