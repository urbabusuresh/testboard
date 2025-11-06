// src/utils/mapExecutionToForm.ts
import type { TestCaseExecution } from "@/types/testcase-execution";
import { logError } from '@/utils/errorHandler';
export function mapExecutionToForm(e: TestCaseExecution) {
  const toDate = (d?: string | Date | null) =>
    d ? new Date(d).toISOString().slice(0, 10) : "";

  const toUiStatus = (s?: string | null) => {
    if (!s) return "inProgress";
    const x = s.toLowerCase();
    if (x.includes("pass")) return "passed";
    if (x.includes("fail")) return "failed";
    if (x.includes("block")) return "blocked";
    return "inProgress";
    };

  return {
    // IDs
    executionId: e.execution_id ?? "",
    runId: e.run_id ?? "",
    cycleNumber: e.cycle_number ?? "",
    cycleType: e.cycle_type ?? "Regression",
    testcase_id: (e as any).testcase_id ?? "",

    // mirror your Build select
    build: String(e.run_id ?? ""),

    // preparation
    preparationStart: toDate(e.preparation_start as any),
    preparationEnd:   toDate(e.preparation_end as any),
    preparedBy: e.prepared_by ?? "",

    // execution
    executionStart: "", // not stored separately
    executionEnd: toDate(e.executed_at as any),
    executedBy: e.executed_by ?? "",

    // lists
    bugs: (e.bug_ids as string[] | null) ?? [],
    attachments: [] as File[], // keep empty; you store names/ids separately

    // misc
    remarks: e.remarks ?? "",
    testStatus: toUiStatus(e.status),
    includeInRun: e.include_in_run ? "include" : "exclude",
    requirementId: e.requirement_ids ?? "",
    testData: e.test_data ?? "",

    // review & approval
    reviewedBy: e.reviewed_by ?? "",
    reviewDate: toDate(e.review_date as any),
    approvedBy: e.approved_by ?? "",
    approvalDate: toDate(e.approved_date as any),
    reviewerComments: e.reviewer_comments ?? "",

    // env
    envOS: e.env_os ?? "",
    envBrowser: e.env_browser ?? "",
    envName: e.env_name ?? "",
    envDatabase: e.env_database ?? "",

    automationIds: [] as string[],
  };
}
