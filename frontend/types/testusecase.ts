// src/types/testusecase.ts
export type TestUseCase = {
  uc_sid: number;
  projectId: number;
  tm_id?: number | null;
  rd_id?: number | null;
  uc_id: string;
  uc_name?: string | null;
  uc_description?: string | null;
  testers?: string[] | null;
  status?: string | null;
  tracability?: any | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  module?: string|null;
  testcasesCount?: number | null;
  scenariosCount?: number | null;
  
};

export type ListMeta = { total: number; limit: number; offset: number; };
