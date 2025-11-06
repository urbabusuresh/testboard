// @/types/testcase-execution.ts

export interface TestCaseExecutionUpsert {
  execution_id: number;
  testcase_id: number;
  run_id: number;
  cycle_number: number;
  projectId: number;
  
  // Add execution_state fsield
  execution_state?: number;
  
  cycle_type?: string | null;
  status?: string | null;
  include_in_run?: boolean;
  test_data?: string | null;
  
  preparation_start?: string | null;
  preparation_end?: string | null;
  prepared_by?: string | null;
  
  executed_by?: string | null;
  executed_at?: string | null;
  
  requirement_ids?: string | null;
  bug_ids?: string;
  attachment_ids?: string;
  
  remarks?: string | null;
  
  reviewed_by?: string | null;
  review_date?: string | null;
  reviewer_comments?: string | null;
  
  approved_by?: string | null;
  approved_date?: string | null;
  approver_comments?: string | null;
  
  env_os?: string | null;
  env_browser?: string | null;
  env_name?: string | null;
  env_database?: string | null;
  
  enhanced_test_case_id?: string | null;
}

export interface TestCaseExecution extends TestCaseExecutionUpsert {
  created_at?: string;
  updated_at?: string;
  
  // Allow both snake_case and camelCase for flexibility
  executionState?: number;
  execution_state?: number;
  executionId?: number;
  runId?: number;
  cycleNumber?: number;
  testcaseId?: number;
}
