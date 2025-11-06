// types/module.ts
export type ModuleItem = {
  tm_id: number;
  projectId: number;
  module: string;
  description?: string | null;
  testers?: string| null;
  developers?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  usecases?: number | null;
  scenarios?: number | null;
  testcases?: number | null;
};

export type ListMeta = {
  total: number;
  limit: number;
  offset: number;
};
