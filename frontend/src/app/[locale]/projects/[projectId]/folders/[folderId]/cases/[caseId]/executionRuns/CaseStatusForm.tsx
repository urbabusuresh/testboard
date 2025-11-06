'use client';
import {
  Input,
  Textarea,
  Select,
  SelectItem,
  Button,
  Divider,
  RadioGroup,
  Radio,
  addToast,
  Spinner,
} from '@heroui/react';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchRuns } from '../../../../../runs/runsControl';
import { listExecutions } from '../services/executionsApi'; // <-- make sure this path matches your project
import { logError } from '@/utils/errorHandler';
import { TokenContext } from '@/utils/TokenProvider';
import { RunType } from '@/types/run';
import BugIdsInput from '../../../../../bugs/BugIdsInput';

type Props = {
  onSubmit: (form: any) => Promise<void>;
  automationStatus?: string;
  submittingText?: string;
  initialValues?: any;
  projectId: number;
  caseId: number; // testcase_id
};

export default function CaseStatusForm({
  onSubmit,
  automationStatus,
  submittingText = 'Saving…',
  initialValues,
  projectId,
  caseId,
}: Props) {
  const tokenCtx = useContext(TokenContext);

  const [saving, setSaving] = useState(false);

  // Runs (Builds)
  const [runs, setRuns] = useState<RunType[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<any>({
    // IDs & cycle (rendered as read-only)
    executionId: '', // shown disabled; when creating, it's blank; parent will assign on submit if needed
    runId: '',
    cycleNumber: '',
    cycleType: 'Regression',
    testcase_id: '',

    // Build label (name)
    build: '',

    // env
    envOS: '',
    envBrowser: '',
    envName: '',
    envDatabase: '',

    // dates & people
    preparationStart: '',
    preparationEnd: '',
    preparedBy: '',
    executionStart: '',
    executionEnd: '',
    executedBy: '',

    // misc
    remarks: '',
    testStatus: 'inProgress',
    includeInRun: 'exclude',
    requirementId: '',
    testData: '',

    // review
    reviewedBy: '',
    approvedBy: '',
    reviewDate: '',
    approvalDate: '',
    reviewerComments: '',

    // arrays
    bugs: [] as string[],
    attachments: [] as File[],
    automationIds: [] as string[],
  });

  // Are we editing an existing execution?
  const isEditing = Boolean(initialValues?.executionId || initialValues?.execution_id);
  const didPrefillRef = useRef(false);

  // Load runs for Build select
  useEffect(() => {
    const loadRuns = async () => {
      if (!tokenCtx?.isSignedIn?.() || !projectId) return;
      try {
        setRunsLoading(true);
        setRunsError(null);
        const data = await fetchRuns(tokenCtx.token.access_token, Number(projectId));
        setRuns(Array.isArray(data) ? data : []);
      } catch (error) {
        setRunsError('Failed to fetch builds');
        logError('Error fetching runs', error);
      } finally {
        setRunsLoading(false);
      }
    };
    loadRuns();
  }, [tokenCtx, projectId]);

  // Prefill when editing
  useEffect(() => {
    if (initialValues && !didPrefillRef.current) {
      didPrefillRef.current = true;
      setForm((prev: any) => ({ ...prev, ...initialValues ,
      bugs: Array.isArray(initialValues.bugs)
        ? initialValues.bugs
        : typeof initialValues.bugs === 'string'
          ? initialValues.bugs.split(',').map((b: string) => b.trim()).filter(Boolean)
          : [], // fallback to []

      }));
    }
  }, [initialValues]);

  // Fast lookup for runs
  const runById = useMemo(() => {
    const m = new Map<number, RunType>();
    runs.forEach((r) => m.set(Number(r.id), r));
    return m;
  }, [runs]);

  // ---- AUTO COMPUTE NEXT CYCLE NUMBER ----
  // If NOT editing and we have (caseId, runId, cycleType), compute cycleNumber = last + 1 (>=0)
  useEffect(() => {
    const computeNextCycle = async () => {
      if (isEditing) return; // don't overwrite existing record
      if (!caseId || !form.runId || !form.cycleType) return;

      try {
        // fetch last record for same testcase + run + cycleType
        const res = await listExecutions({
          page: 1,
          limit: 1,
          sortBy: 'cycle_number',
          sortOrder: 'DESC',
          testcase_id: String(caseId),
          run_id: String(form.runId),
          // if your controller supports filtering by cycle_type:
          // cycle_type: form.cycleType,
        } as any);

        const last = res?.data?.[0]?.cycle_number ?? 0;
        const next = Math.max(0, Number(last) + 1);
        setForm((prev: any) => ({ ...prev, cycleNumber: next }));
      } catch (err) {
        // On failure, default to 1 (never negative)
        setForm((prev: any) => ({ ...prev, cycleNumber: 1 }));
        logError('Failed to compute next cycle number', err);
      }
    };

    computeNextCycle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, form.runId, form.cycleType, isEditing]);

  return (
    <div className="space-y-6 ">
      {/* Row 1: Build + Status + Include */}
      <div className="grid grid-cols-3 gap-4">
        {/* Build select (popup) - choose run → sets runId (value) and build (name) */}
        <div className="flex items-end">
          <Select
            size="sm"
            variant="bordered"
            label="Build"
            selectedKeys={
              form.runId !== '' && form.runId !== undefined ? [String(form.runId)] : []
            }
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string | undefined;
              const id = selected ? Number(selected) : '';
              const run = id !== '' ? runById.get(Number(id)) : undefined;
              setForm((prev: any) => ({
                ...prev,
                runId: id,                 // internal id
                build: run?.name || '',    // label
                executionId: '', 
              }));
            }}
            isLoading={runsLoading}
            disallowEmptySelection={false}
            placeholder={runsLoading ? 'Loading…' : 'Select a build'}
          >
            {runsError ? (
              <SelectItem key="__error" isDisabled>
                {runsError}
              </SelectItem>
            ) : runs.length > 0 ? (
              runs.map((r) => (
                <SelectItem key={String(r.id)} textValue={r.name}>
                  {r.name}
                </SelectItem>
              ))
            ) : runsLoading ? (
              <SelectItem key="__loading" isDisabled>
                <div className="flex items-center gap-2">
                  <Spinner size="sm" /> Loading…
                </div>
              </SelectItem>
            ) : (
              <SelectItem key="__empty" isDisabled>
                No builds found
              </SelectItem>
            )}
          </Select>
        </div>

        <Select
          size="sm"
          variant="bordered"
          label="Test Status"
          selectedKeys={[form.testStatus]}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as string;
            setForm((prev: any) => ({ ...prev, testStatus: value }));
          }}
        >
          <SelectItem key="untested">Un-Tested</SelectItem>
          <SelectItem key="passed">Passed</SelectItem>
          <SelectItem key="failed">Failed</SelectItem>
          <SelectItem key="inProgress">In Progress</SelectItem>
          <SelectItem key="blocked">Blocked</SelectItem>
          <SelectItem key="retest">Retest</SelectItem>
          <SelectItem key="skipped">Skipped</SelectItem>
        </Select>

        <div className="flex flex-col justify-center">
          <label className="text-sm font-medium mb-1">Include in Run</label>
          <RadioGroup
            orientation="horizontal"
            value={form.includeInRun}
            onValueChange={(val) => setForm({ ...form, includeInRun: val })}
          >
            <Radio value="include">Include</Radio>
            <Radio value="exclude">Exclude</Radio>
          </RadioGroup>
        </div>
      </div>

      {/* IDs & Cycle (READ-ONLY) */}
      <div className="grid grid-cols-4 gap-4">
        <Input
          size="sm"
          label="Execution ID"
          type="number"
          value={form.executionId}
          isDisabled
          description="Primary key (auto on create / fixed on edit)"
        />
        <Input
          size="sm"
          label="Run ID (from Build)"
          type="number"
          value={form.runId}
          isDisabled
          description="Filled when you choose a Build"
        />
        <Input
          size="sm"
          label="Cycle Number"
          type="number"
          value={form.cycleNumber}
          isDisabled
          description="Auto = previous cycle + 1 for this Build & Type"
        />
        <Input
          size="sm"
          label="Cycle Type"
          value={form.cycleType}
          onChange={(e) => setForm((s: any) => ({ ...s, cycleType: e.target.value }))}
        />
      </div>

      {/* Environment */}
      <div>
        <h6 className="font-bold mb-2">Environment</h6>
        <div className="grid grid-cols-4 gap-4">
          <Input
            size="sm"
            label="OS"
            value={form.envOS}
            onChange={(e) => setForm((s: any) => ({ ...s, envOS: e.target.value }))}
          />
          <Input
            size="sm"
            label="Browser"
            value={form.envBrowser}
            onChange={(e) => setForm((s: any) => ({ ...s, envBrowser: e.target.value }))}
          />
          <Input
            size="sm"
            label="Env (dev/qa/uat/prod)"
            value={form.envName}
            onChange={(e) => setForm((s: any) => ({ ...s, envName: e.target.value }))}
          />
          <Input
            size="sm"
            label="Database"
            value={form.envDatabase}
            onChange={(e) => setForm((s: any) => ({ ...s, envDatabase: e.target.value }))}
          />
        </div>
      </div>

      <Divider />

      {/* Requirement Traceability */}
      <div>
        <h6 className="font-bold mb-2">Requirement Traceability</h6>
        <Input
          size="sm"
          label="Requirement ID / User Story ID"
          placeholder="e.g. REQ-1234 / US-456"
          value={form.requirementId}
          onChange={(e) => setForm({ ...form, requirementId: e.target.value })}
        />
      </div>

      {/* Test Data */}
      <div>
        <h6 className="font-bold mb-2">Test Data</h6>
        <Textarea
          size="sm"
          variant="bordered"
          placeholder="Enter test data values or datasets"
          value={form.testData}
          onValueChange={(val) => setForm({ ...form, testData: val })}
        />
      </div>

      {/* Remarks */}
      <div>
        <h6 className="font-bold mb-2">Remarks</h6>
        <Textarea
          size="sm"
          variant="bordered"
          placeholder="Enter remarks or comments"
          value={form.remarks}
          onValueChange={(val) => setForm({ ...form, remarks: val })}
        />
      </div>

      <Divider />

      {/* Preparation */}
      <div>
        <h6 className="font-bold mb-2">Preparation</h6>
        <div className="grid grid-cols-3 gap-4">
          <Input
            size="sm"
            label="Start Date"
            type="date"
            value={form.preparationStart}
            onChange={(e) => setForm({ ...form, preparationStart: e.target.value })}
          />
          <Input
            size="sm"
            label="End Date"
            type="date"
            value={form.preparationEnd}
            onChange={(e) => setForm({ ...form, preparationEnd: e.target.value })}
          />
          <Input
            size="sm"
            label="Prepared By"
            value={form.preparedBy}
            onChange={(e) => setForm({ ...form, preparedBy: e.target.value })}
          />
        </div>
      </div>

      {/* Execution */}
      <div>
        <h6 className="font-bold mb-2">Execution</h6>
        <div className="grid grid-cols-3 gap-4">
          <Input
            size="sm"
            label="Start Date"
            type="date"
            value={form.executionStart}
            onChange={(e) => setForm({ ...form, executionStart: e.target.value })}
          />
          <Input
            size="sm"
            label="End Date"
            type="date"
            value={form.executionEnd}
            onChange={(e) => setForm({ ...form, executionEnd: e.target.value })}
          />
          <Input
            size="sm"
            label="Executed By"
            value={form.executedBy}
            onChange={(e) => setForm({ ...form, executedBy: e.target.value })}
          />
        </div>
      </div>

      <Divider />

      {/* Bugs + Automation testcases ids */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div>
  <h6 className="font-bold mb-2">Add Bug Ids</h6>
  <BugIdsInput
    value={Array.isArray(form.bugs) ? form.bugs : []}
    onChange={(bugs) => setForm({ ...form, bugs })}
    placeholder="e.g. 12345 or BUG-101 (paste supports commas)"
  />
</div>
        </div>

        {automationStatus === 'automated' && (
          <div>
            <h6 className="font-bold mb-2">Automation Test Case IDs</h6>
            <Textarea
              size="sm"
              variant="bordered"
              placeholder="Enter IDs (comma separated)"
              value={form.automationIds.join(',')}
              onValueChange={(val) =>
                setForm({
                  ...form,
                  automationIds: val.split(',').map((id) => id.trim()).filter(Boolean),
                })
              }
            />
          </div>
        )}
      </div>

      <Divider />

      {/* Review & Approval */}
      <div>
        <h6 className="font-bold mb-2">Review & Approval</h6>
        <div className="grid grid-cols-2 gap-4">
          <Input
            size="sm"
            label="Reviewed By"
            value={form.reviewedBy}
            onChange={(e) => setForm({ ...form, reviewedBy: e.target.value })}
          />
          <Input
            size="sm"
            label="Review Date"
            type="date"
            value={form.reviewDate}
            onChange={(e) => setForm({ ...form, reviewDate: e.target.value })}
          />
          <Input
            size="sm"
            label="Approved By"
            value={form.approvedBy}
            onChange={(e) => setForm({ ...form, approvedBy: e.target.value })}
          />
          <Input
            size="sm"
            label="Approval Date"
            type="date"
            value={form.approvalDate}
            onChange={(e) => setForm({ ...form, approvalDate: e.target.value })}
          />
        </div>
        <Textarea
          size="sm"
          variant="bordered"
          label="Reviewer Comments"
          placeholder="Reviewer notes / audit remarks"
          value={form.reviewerComments}
          onValueChange={(val) => setForm({ ...form, reviewerComments: val })}
          className="mt-3"
        />
      </div>

      <Divider />

      <div>
        <h6 className="font-bold mb-2">Attachments</h6>
        <input
          type="file"
          multiple
          onChange={(e) =>
            setForm({
              ...form,
              attachments: e.target.files ? Array.from(e.target.files) : [],
            })
          }
        />
        {form.attachments.length > 0 && (
          <ul className="text-sm mt-2 list-disc list-inside">
            {form.attachments.map((f: File, idx: number) => (
              <li key={idx}>{f.name}</li>
            ))}
          </ul>
        )}
      </div>

      {/* sticky footer */}
      <div className="sticky bottom-0 bg-white dark:bg-neutral-800 border-t p-4 flex justify-end">
        <Button
          size="sm"
          color="primary"
          isDisabled={
            saving ||
            form.runId === '' ||
            form.cycleNumber === '' 
            
          }
          onPress={async () => {
            try {
              setSaving(true);
              // guard cycleNumber non-negative (should already be)
              const cycle = Math.max(0, Number(form.cycleNumber || 0));
              setForm((prev: any) => ({ ...prev, cycleNumber: cycle }));
              await onSubmit({ ...form, cycleNumber: cycle, testcase_id: caseId });
              addToast({ title: 'Success', description: 'Execution saved' });
            } catch (e: any) {
              addToast({ title: 'Error', description: e?.message ?? 'Save failed' });
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? submittingText : 'Save Execution'}
        </Button>
      </div>
    </div>
  );
}
