// src/types/referencedoc.ts
export type ReferenceDoc = {
  rd_id: number;
  projectId: number;
  tm_id: number;
  docsType?: string | null;
  docName?: string | null;
  version?: string | null;
  link?: string | null;
  status?: string | null;
  releaseDate?: string | null;
  notes?: string | null;
  createdAt?: string|null;
  updatedAt?: string|null;
  deletedAt?: string|null;
};
export type ListMeta = { total:number; limit:number; offset:number; };
