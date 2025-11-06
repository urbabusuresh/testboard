// src/types/testcase.ts
export type TestCase = {
  tc_sid: number;
  projectId: number;
  ts_sid?: number | null;
  ts_id?: string | null;
  tc_id: string;
  tc_description?: string | null;
  steps?: string | null;
  expected_results?: any | null;
  actual_result?: any | null;
  testers?: string[] | null;
  status?: string | null;
  createdAt?: string|null;
  updatedAt?: string|null;
  deletedAt?: string|null;
};
export type ListMeta = { total:number; limit:number; offset:number; };
