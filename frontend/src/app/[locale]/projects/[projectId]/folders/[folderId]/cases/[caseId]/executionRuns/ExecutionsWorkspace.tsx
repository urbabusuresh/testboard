'use client';
import { Tabs, Tab } from '@heroui/react';
import { useMemo, useState } from 'react';

import CaseStatusForm from './CaseStatusForm';
import ExecutionHistory from './ExecutionHistory';
import { RunType, RunsMessages } from '@/types/run';
import { LocaleCodeType } from '@/types/locale';
import { upsertExecution } from '../services/executionsApi';
import { mapFormToUpsert } from '../utils/mapExecutionForm';
import { mapExecutionToForm } from '../utils/mapExecutionToForm';
import type { TestCaseExecution } from '@/types/testcase-execution';

type Props = {
  projectId: string;
  folderId: string;
  caseId:string;
};

export default function ExecutionsWorkspace({ projectId, folderId, caseId }: Props) {
  const [active, setActive] = useState<React.Key>('update');
  const [selected, setSelected] = useState<TestCaseExecution | null>(null);

  const initialValues = useMemo(
    () => (selected ? mapExecutionToForm(selected) : undefined),
    [selected]
  );

  // Case Update tab → /executions/upsert
  const handleSubmit = async (form: any) => {
    const execution_id = Number(form.executionId || Date.now());
    const run_id       = Number(form.runId || form.build || 1);
    const cycle_number = Number(form.cycleNumber || 1);
    const testcase_id  = Number(caseId);
    const project_id= Number( projectId);
    const payload = mapFormToUpsert(form, { execution_id, run_id, cycle_number, testcase_id ,project_id });
    await upsertExecution(payload);
  };

  return (
    <div className="p-2">
      <Tabs
        aria-label="Executions"
        color="primary"
        variant="bordered"
        selectedKey={active}
        onSelectionChange={setActive}
      >
        <Tab key="update" title="Case Update">
          <div className="mt-2">
            <CaseStatusForm
              onSubmit={handleSubmit}
              builds={['1', '2', '3']}   // TODO: replace with real run_id options
              automationStatus="automated"
              initialValues={initialValues}   // 👈 prefill when selected
              projectId={projectId}
              caseId={caseId}

            />
          </div>
        </Tab>

        <Tab key="history" title="History">
          <div className="mt-4">
            <ExecutionHistory
              onEdit={(row) => {
                setSelected(row);     // store the selected execution
                setActive('update');  // switch to Case Update tab
              }}
            />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
