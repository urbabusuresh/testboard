// src/types/testscenario.ts
export type TestScenario = {
  ts_sid: number;
  projectId: number;
  uc_sid: number;
  ts_id: string;
  uc_id?: string | null;
  ts_description?: string | null;
  ts_type?: string | null;
  testers?: string[] | null;
  preparation_effort?: string | null;
  tracability?: any | null;
  createdAt?: string|null;
  updatedAt?: string|null;
  deletedAt?: string|null;
};
export type ListMeta = { total:number; limit:number; offset:number; };
