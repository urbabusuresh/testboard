
'use client';
import { useEffect, useState } from 'react';
import { Button, Input, Select, SelectItem, addToast } from '@heroui/react';
import { listExecutions, deleteExecution } from '../services/executionsApi';
import type { TestCaseExecution } from '@/types/testcase-execution';


export default function ExecutionHistory({
  onEdit,
}: {
  onEdit?: (row: TestCaseExecution) => void;  // 👈 optional + guarded
}) {
  const [rows, setRows] = useState<TestCaseExecution[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<{ status?: string; run_id?: string; testcase_id?: string }>({});

  async function load(p = 1) {
    const res = await listExecutions({
      page: p, limit: 20, sortBy: 'executed_at', sortOrder: 'DESC',
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.run_id ? { run_id: filters.run_id } : {}),
      ...(filters.testcase_id ? { testcase_id: filters.testcase_id } : {}),
    });
    setRows(res.data); setPage(res.page); setTotalPages(res.totalPages);
  }

  useEffect(() => { load().catch(console.error); }, []);

  const onDeleteRow = async (execution_id: number) => {
    await deleteExecution(execution_id);
    addToast({ title: 'Deleted', description: `Execution ${execution_id} removed` });
    await load(page);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-4 gap-3">
        <Input size="sm" label="Testcase ID" value={filters.testcase_id || ''} onChange={(e)=>setFilters(f=>({...f, testcase_id: e.target.value}))}/>
        <Input size="sm" label="Run ID" value={filters.run_id || ''} onChange={(e)=>setFilters(f=>({...f, run_id: e.target.value}))}/>
        <Select size="sm" label="Status"
          selectedKeys={filters.status ? [filters.status] : []}
          onSelectionChange={(k)=>{ const v = Array.from(k)[0] as string|undefined; setFilters(f=>({...f, status: v})); }}>
          <SelectItem key="Passed">Passed</SelectItem>
          <SelectItem key="Failed">Failed</SelectItem>
          <SelectItem key="In Progress">In Progress</SelectItem>
          <SelectItem key="Blocked">Blocked</SelectItem>
        </Select>
        <div className="flex items-end gap-2">
          <Button size="sm" onPress={()=>load(1)}>Apply</Button>
          <Button size="sm" variant="flat" onPress={()=>{setFilters({}); setRows([]);}}>Reset</Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 dark:bg-neutral-800 sticky top-0">
            <tr>
              <th className="p-2 text-left">Execution ID</th>
              <th className="p-2 text-left">Run ID</th>
              <th className="p-2 text-left">Cycle #</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Executed By</th>
              <th className="p-2 text-left">Executed At</th>
              <th className="p-2 text-left">Include</th>
              <th className="p-2 text-left">Env</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.execution_id}`} className="border-t">
                <td className="p-2">{r.execution_id}</td>
                <td className="p-2">{r.run_id}</td>
                <td className="p-2">{r.cycle_number}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.executed_by ?? '-'}</td>
                <td className="p-2">{r.executed_at ? new Date(r.executed_at).toLocaleDateString() : '-'}</td>
                <td className="p-2">{r.include_in_run ? 'Yes' : 'No'}</td>
                <td className="p-2">{r.env_name ?? '-'}</td>
                <td className="p-2 flex gap-2">
                  {onEdit && (
                    <Button size="sm" variant="flat" onPress={() => onEdit(r)}>Edit</Button>
                  )}
                  <Button size="sm" color="danger" variant="flat" onPress={() => onDeleteRow(r.execution_id!)}>Delete</Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4 text-center text-neutral-500">No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500">Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="flat" isDisabled={page<=1} onPress={()=>load(page-1)}>Prev</Button>
          <Button size="sm" variant="flat" isDisabled={page>=totalPages} onPress={()=>load(page+1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
