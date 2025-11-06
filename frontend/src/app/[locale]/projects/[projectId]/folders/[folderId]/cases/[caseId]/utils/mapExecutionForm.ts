// src/utils/mapExecutionForm.ts
import { TestCaseExecutionUpsert } from "@/types/testcase-execution";

type FormState = {
  // visible fields you already have
  build: string;                 // maps to run_id (number)
  testStatus: "passed" | "failed" | "inProgress" | "blocked";
  includeInRun: "include" | "exclude";
  testData: string;
  requirementId: string;
  preparationStart: string;      // yyyy-MM-dd
  preparationEnd: string;
  preparedBy: string;
  executionStart: string;        // yyyy-MM-dd (optional)
  executionEnd: string;          // yyyy-MM-dd
  executedBy: string;
  bugs: string;
  attachments: string;
  remarks: string;
  testcase_id:number;
  reviewedBy: string;
  reviewDate: string;
  approvedBy: string;
  approvalDate: string;
  reviewerComments: string;
projectId:number;
  // Optional extra fields you might add to the modal:
  envOS?: string;
  envBrowser?: string;
  envName?: string;
  envDatabase?: string;

  // hidden/controlled from parent
  executionId?: number;
  cycleNumber?: number;
  cycleType?: string;

  executionState?:number;
};

export function mapFormToUpsert(
  form: FormState,
  ids: { execution_id: number; run_id: number; cycle_number: number ;testcase_id:number;project_id:number}
): TestCaseExecutionUpsert {
  const statusMap: Record<string, string> = {
    passed: "Passed",
    failed: "Failed",
    inProgress: "In Progress",
    blocked: "Blocked",
  };

  return {
    execution_id: ids.execution_id,
    testcase_id:ids.testcase_id,
    run_id: ids.run_id,
    cycle_number: ids.cycle_number,
    projectId:ids.project_id,
    cycle_type: form.cycleType || "Regression",
    status: statusMap[form.testStatus] ?? form.testStatus,
    include_in_run: form.includeInRun === "include",
    test_data: form.testData || null,

    preparation_start: form.preparationStart || null,
    preparation_end: form.preparationEnd || null,
    prepared_by: form.preparedBy || null,

    executed_by: form.executedBy || null,
    // choose end as executed_at (typical)
    executed_at: form.executionEnd || form.executionStart || null,

    requirement_ids: form.requirementId || null,
    bug_ids: (form.bugs || []).filter(Boolean),
    attachment_ids: (form.attachments || []).map(f => f.name),

    remarks: form.remarks || null,

    reviewed_by: form.reviewedBy || null,
    review_date: form.reviewDate || null,
    reviewer_comments: form.reviewerComments || null,

    approved_by: form.approvedBy || null,
    approved_date: form.approvalDate || null,
    approver_comments: null,

    env_os: form.envOS || null,
    env_browser: form.envBrowser || null,
    env_name: form.envName || null,
    env_database: form.envDatabase || null,
    execution_state:form.executionState || 0,
  };
}
