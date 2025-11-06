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
  projectId: any;
  caseId: any;
  buildId: string | number;
};

export default function ExecutionsWorkspace({ projectId, caseId, buildId }: Props) {
  const [active, setActive] = useState<React.Key>('update');
  const [selected, setSelected] = useState<TestCaseExecution | null>(null);

  const initialValues = useMemo(
    () => (selected ? mapExecutionToForm(selected) : undefined),
    [selected]
  );

  // Case Update tab → /executions/upsert
  const handleSubmit = async (form: any) => {
    const execution_id = Number(form.executionId || Date.now());
    const run_id = Number(form.runId || form.build || 1);
    const cycle_number = Number(form.cycleNumber || 1);
    const testcase_id = Number(caseId);
    //const projectIdNum = Number(projectId);
    const execution_state = Number(form.executionState ?? 0); // Ensure execution state is included

    const payload = mapFormToUpsert(form, {
      execution_id,
      run_id,
      cycle_number,
      testcase_id,
      projectId,
      execution_state, // Pass execution state explicitly
    });

    await upsertExecution(payload);

    // After successful update, if we're editing, refresh the selected item
    if (selected) {
      setSelected({ ...selected, executionState: execution_state });
    }
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
              buildId={buildId}
              initialValues={initialValues} // prefill when selected
              projectId={projectId}
              caseId={caseId}
            />
          </div>
        </Tab>

        <Tab key="history" title="History">
          <div className="mt-4">
            <ExecutionHistory
              
              onEdit={(row) => {
                setSelected(row); // store the selected execution
                setActive('update'); // switch to Case Update tab
              }}
              projectId={projectId}
              caseId={caseId}
            />
          </div>
        </Tab>
       
         <Tab key="tetscase_for_review" title="Ready to Review (1)">
          <div className="mt-4">
            <ExecutionHistory
              
              onEdit={(row) => {
                setSelected(row); // store the selected execution
                setActive('update'); // switch to Case Update tab
              }}
              projectId={projectId}
              caseId={caseId}
              execution_state='1'
            />
          </div>
        </Tab>
        <Tab key="tetscase_under_review" title="Under Review (2)">
          <div className="mt-4">
            <ExecutionHistory
              
              onEdit={(row) => {
                setSelected(row); // store the selected execution
                setActive('update'); // switch to Case Update tab
              }}
              projectId={projectId}
              caseId={caseId}
              execution_state='2'
            />
          </div>
        </Tab>
          <Tab key="testcase_for_approval" title="Ready for Approval(3)">
          <div className="mt-4">
            <ExecutionHistory
              
              onEdit={(row) => {
                setSelected(row); // store the selected execution
                setActive('update'); // switch to Case Update tab
              }}
              projectId={projectId}
              caseId={caseId}
              execution_state='3'
            />
          </div>
        </Tab>
          <Tab key="testcase_for_completed" title="Completed(4)">
          <div className="mt-4">
            <ExecutionHistory
              
              onEdit={(row) => {
                setSelected(row); // store the selected execution
                setActive('update'); // switch to Case Update tab
              }}
              projectId={projectId}
              caseId={caseId}
              execution_state='4'
            />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
