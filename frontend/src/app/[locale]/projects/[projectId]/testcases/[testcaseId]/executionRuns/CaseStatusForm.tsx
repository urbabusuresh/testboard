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
import { fetchRuns } from '../../../runs/runsControl';
import { listExecutions } from '../services/executionsApi';
import { logError } from '@/utils/errorHandler';
import { TokenContext } from '@/utils/TokenProvider';
import { RunType } from '@/types/run';
import BugIdsInput from '../../../bugs/BugIdsInput';

type Props = {
  onSubmit: (form: any) => Promise<void>;
  submittingText?: string;
  initialValues?: any;
  projectId: number;
  caseId: number;
  buildId: number | string;
};

/**
 * Execution State Flow:
 * 0 - Initial (Developer/Tester can edit and save)
 * 1 - Sent for Review (only Lead Reviewer can move it)
 * 2 - Under Review (Reviewer working on it)
 * 3 - Sent for Approval (only Lead Approver can move it)
 * 4 - Approved (Final state, Lead/Manager can reopen)
 * -1 - Rejected/Returned (back to Developer/Tester)
 */

export default function CaseStatusForm({
  onSubmit,
  submittingText = 'Saving…',
  initialValues,
  projectId,
  caseId,
  buildId,
}: Props) {
  const tokenCtx = useContext(TokenContext);
  let projectIdNum = Number(projectId);
  const [saving, setSaving] = useState(false);
  const [runs, setRuns] = useState<RunType[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);

  const [form, setForm] = useState<any>({
    executionId: '',
    runId: '',
    cycleNumber: 1,
    cycleType: 'Sanity',
    testcase_id: '',
    build: '',
    envOS: 'Windows 10',
    envBrowser: 'Chrome',
    envName: '',
    envDatabase: '',
    preparationStart: '',
    preparationEnd: '',
    preparedBy: '',
    executionStart: '',
    executionEnd: '',
    executedBy: '',
    remarks: '',
    testStatus: 'InProgress',
    includeInRun: 'include',
    requirementId: '',
    testData: '',
    reviewedBy: '',
    reviewDate: '',
    reviewerComments: '',
    approvedBy: '',
    approvalDate: '',
    approverComments: '',
    bugs: '',
    attachments: '',
    enhanced_test_case_id: '',
    executionState: 0, // Initial state
    cycleOption:'current',
    projectId:projectIdNum, //projectIdNum,

  });

  const isEditing = Boolean(initialValues?.executionId || initialValues?.execution_id);
  const didPrefillRef = useRef(false);

  const token = tokenCtx?.token ?? (tokenCtx as any);
  const currentUserName = token?.user?.username || '';
  const hasDeveloperRole = tokenCtx.isProjectDeveloper(Number(projectIdNum));
  const hasReviewerRole = tokenCtx.isProjectReviewer(Number(projectIdNum));
  const hasApproverRole = tokenCtx.isProjectApprover(Number(projectIdNum));
  const hasManagerRole = tokenCtx.isProjectManager(Number(projectIdNum));
  const hasLeadRole = tokenCtx.isProjectLead(Number(projectIdNum));

  // Determine what actions current user can perform based on execution state
  const canEdit = useMemo(() => {
    const state = Number(form.executionState || 0);
    
    // State 0 or -1: Developer/Tester can edit
    if (state === 0 || state === -1) {
      return hasDeveloperRole || hasLeadRole || hasManagerRole;
    }
    
    // State 1-4: No editing for developer/tester
    return false;
  }, [form.executionState, hasDeveloperRole, hasLeadRole, hasManagerRole]);

  const canReview = useMemo(() => {
    const state = Number(form.executionState || 0);
    //alert(state)
    // Can review if state is 1 (sent for review) or 2 (under review)
    return (state === 1 || state === 2) && (hasReviewerRole || hasLeadRole || hasManagerRole);
  }, [form.executionState, hasReviewerRole, hasLeadRole, hasManagerRole]);

  const canApprove = useMemo(() => {
    const state = Number(form.executionState || 0);
    // Can approve if state is 3 (sent for approval)
    return state === 3 && (hasApproverRole || hasLeadRole || hasManagerRole);
  }, [form.executionState, hasApproverRole, hasLeadRole, hasManagerRole]);

  const canReopen = useMemo(() => {
    const state = Number(form.executionState || 0);
    // Lead/Manager can reopen from any state > 0
    return state > 0 && (hasLeadRole || hasManagerRole);
  }, [form.executionState, hasLeadRole, hasManagerRole]);

  const canSendForReview = useMemo(() => {
    const state = Number(form.executionState || 0);
    // Can send for review if state is 0 or -1
    return (state === 0 || state === -1) && (hasDeveloperRole || hasLeadRole || hasManagerRole);
  }, [form.executionState, hasDeveloperRole, hasLeadRole, hasManagerRole]);

  // Load runs
  useEffect(() => {
    const loadRuns = async () => {
      if (!tokenCtx?.isSignedIn?.() || !projectIdNum) return;
      try {
        setRunsLoading(true);
        setRunsError(null);
        const data = await fetchRuns(tokenCtx.token.access_token, Number(projectIdNum));
        setRuns(Array.isArray(data) ? data : []);
      } catch (error) {
        setRunsError('Failed to fetch builds');
        logError('Error fetching runs', error);
      } finally {
        setRunsLoading(false);
      }
    };
    loadRuns();
  }, [tokenCtx, projectIdNum]);

  // Prefill when editing// Prefill when editing
useEffect(() => {
  if (initialValues && !didPrefillRef.current) {
    didPrefillRef.current = true;

    const normalizeCSV = (val: any): string => {
      if (!val) return '';
      if (Array.isArray(val)) {
        return val
          .map((x) => String(x).trim())
          .filter(Boolean)
          .join(',');
      }
      if (typeof val === 'string') {
        return val
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .join(',');
      }
      return '';
    };

    setForm((prev: any) => ({
      ...prev,
      ...initialValues,
      bugs: normalizeCSV(initialValues.bugs),
      attachments: normalizeCSV(initialValues.attachments),
     
      executionState:
        initialValues.executionState !== undefined &&
        initialValues.executionState !== null
          ? Number(initialValues.executionState)
          : 0,
    }));
  }
}, [initialValues]);


  // Set default user names
  useEffect(() => {
    setForm((prev: any) => {
      const next = { ...prev };
      if (!next.preparedBy) next.preparedBy = currentUserName || next.preparedBy;
      if (!next.executedBy) next.executedBy = currentUserName || next.executedBy;
      if (!next.reviewedBy && tokenCtx.isProjectReviewer(projectIdNum))
        next.reviewedBy = currentUserName;
      if (!next.approvedBy && tokenCtx.isProjectApprover(projectIdNum))
        next.approvedBy = currentUserName;
      return next;
    });
  }, [currentUserName, projectIdNum, tokenCtx]);

  const runById = useMemo(() => {
    const m = new Map<number, RunType>();
    runs.forEach((r) => m.set(Number(r.id), r));
    return m;
  }, [runs]);

  // Auto compute next cycle number
  useEffect(() => {
    const computeNextCycle = async () => {
      if (isEditing) return;
      if (!caseId || !form.runId || !form.cycleType) return;

      try {
        const res = await listExecutions({
          page: 1,
          limit: 1,
          sortBy: 'cycle_number',
          sortOrder: 'DESC',
          testcase_id: String(caseId),
          run_id: String(form.runId),
        } as any);

        const last = res?.data?.[0]?.cycle_number ?? 0;
        const next = Math.max(0, Number(last) + 1);
        setForm((prev: any) => ({ ...prev, cycleNumber: next }));
      } catch (err) {
        setForm((prev: any) => ({ ...prev, cycleNumber: 1 }));
        logError('Failed to compute next cycle number', err);
      }
    };
    computeNextCycle();
  }, [caseId, form.runId, form.cycleType, isEditing]);

  // Set buildId if provided
  useEffect(() => {
    if (buildId && runs.length > 0) {
      const run = runs.find((r) => String(r.id) === String(buildId));
      if (run) {
        setForm((prev: any) => ({
          ...prev,
          runId: run.id,
          build: run.name,
        }));
      }
    }
  }, [buildId, runs]);

  const OS_OPTIONS = ['Windows 10', 'Windows 11', 'Ubuntu 20.04', 'Ubuntu 22.04', 'macOS Monterey', 'macOS Ventura'];
  const BROWSER_OPTIONS = ['Chrome', 'Firefox', 'Edge', 'Safari'];
  const ENV_OPTIONS = ['DEV', 'QA', 'UAT', 'STAGING', 'PROD'];

  // Handle different submit actions
  const handleSave = async () => {
    try {
      setSaving(true);
      const cycle = Math.max(0, Number(form.cycleNumber || 0));
      
      await onSubmit({ 
        ...form, 
        cycleNumber: cycle, 
        testcase_id: caseId,
        executionState: form.executionState // Keep current state
      });
      addToast({ title: 'Success', description: 'Execution saved' });
    } catch (e: any) {
      addToast({ title: 'Error', description: 'Save failed:' +e});
    } finally {
      setSaving(false);
    }
  };

  const handleSendForReview = async () => {
    try {
      setSaving(true);
      const cycle = Math.max(0, Number(form.cycleNumber || 0));
      await onSubmit({ 
        ...form, 
        cycleNumber: cycle, 
        testcase_id: caseId,
        executionState: 1 // Send for review
      });
      addToast({ title: 'Success', description: 'Sent for review' });
    } catch (e: any) {
      addToast({ title: 'Error', description: e?.message ?? 'Failed to send for review' });
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (approve: boolean) => {
    try {
      setSaving(true);
      const cycle = Math.max(0, Number(form.cycleNumber || 0));
      const newState = approve ? 3 : -1; // 3 = send for approval, -1 = reject
      await onSubmit({ 
        ...form, 
        cycleNumber: cycle, 
        testcase_id: caseId,
        executionState: newState,
        reviewedBy: currentUserName,
        reviewDate: new Date().toISOString().split('T')[0],
      });
      addToast({ 
        title: 'Success', 
        description: approve ? 'Sent for approval' : 'Returned to developer' 
      });
    } catch (e: any) {
      addToast({ title: 'Error', description: e?.message ?? 'Review action failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleApproval = async (approve: boolean) => {
    try {
      setSaving(true);
      const cycle = Math.max(0, Number(form.cycleNumber || 0));
      const newState = approve ? 4 : 2; // 4 = approved, 2 = back to review
      await onSubmit({ 
        ...form, 
        cycleNumber: cycle, 
        testcase_id: caseId,
        executionState: newState,
        approvedBy: currentUserName,
        approvalDate: new Date().toISOString().split('T')[0],
      });
      addToast({ 
        title: 'Success', 
        description: approve ? 'Test case approved' : 'Returned to reviewer' 
      });
    } catch (e: any) {
      addToast({ title: 'Error', description: e?.message ?? 'Approval action failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    try {
      setSaving(true);
      const cycle = Math.max(0, Number(form.cycleNumber || 0));
      await onSubmit({ 
        ...form, 
        cycleNumber: cycle, 
        testcase_id: caseId,
        executionState: 0 // Back to initial state
      });
      addToast({ title: 'Success', description: 'Test case reopened' });
    } catch (e: any) {
      addToast({ title: 'Error', description: e?.message ?? 'Failed to reopen' });
    } finally {
      setSaving(false);
    }
  };

  // Get current state label
  const getStateLabel = (state: number) => {
    switch (state) {
      case 0: return 'Draft';
      case 1: return 'Pending Review';
      case 2: return 'Under Review';
      case 3: return 'Pending Approval';
      case 4: return 'Approved';
      case -1: return 'Rejected';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Execution State Indicator */}
      {isEditing && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-medium">Current State: </span>
              <span className="text-lg font-bold text-primary">
                {getStateLabel(form.executionState)}
              </span>
            </div>
            {form.executionState === 4 && (
              <span className="text-xs text-success">✓ Completed</span>
            )}
          </div>
        </div>
      )}

      {/* Row 1: Build + Status + Include */}
      <div className="grid grid-cols-4 gap-4">
        <div className="flex items-end">
          <Select
            size="sm"
            variant="bordered"
            label="Build"
            selectedKeys={form.runId !== '' && form.runId !== undefined ? [String(form.runId)] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string | undefined;
              const id = selected ? Number(selected) : '';
              const run = id !== '' ? runById.get(Number(id)) : undefined;
              setForm((prev: any) => ({
                ...prev,
                runId: id,
                build: run?.name || '',
                executionId: '',
              }));
            }}
            isLoading={runsLoading}
            disallowEmptySelection={false}
            placeholder={runsLoading ? 'Loading…' : 'Select a build'}
            isDisabled={!canEdit}
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
          isDisabled={!canEdit}
        >
          <SelectItem key="untested">Un-Tested</SelectItem>
          <SelectItem key="passed">Passed</SelectItem>
          <SelectItem key="failed">Failed</SelectItem>
          <SelectItem key="inProgress">In Progress</SelectItem>
          <SelectItem key="blocked">Blocked</SelectItem>
          <SelectItem key="retest">Retest</SelectItem>
          <SelectItem key="skipped">Skipped</SelectItem>
          <SelectItem key="notImplemented">Not Implemented</SelectItem>
          <SelectItem key="enhancement">Enhancement/Revised</SelectItem>
        </Select>
          <div className="flex flex-col justify-center">
          <label className="text-sm font-medium mb-1">Include in Run</label>
          <RadioGroup
            orientation="horizontal"
            value={buildId && form.includeInRun ? form.includeInRun : 'include'}
            onValueChange={(val) => setForm({ ...form, includeInRun: val })}
            isDisabled={!canEdit}
          >
            <Radio value="include">Include</Radio>
            {/* <Radio value="exclude">Exclude</Radio> */}
          </RadioGroup>
        </div>
         <div className="flex flex-col justify-center">
  <label className="text-sm font-medium mb-1">Cycle</label>
  <RadioGroup
    orientation="horizontal"
    value={form.cycleOption || 'current'} // default: current
    onValueChange={(val) => {
      setForm((prev: any) => {
        let nextCycle = prev.cycleNumber;

        if (val === 'new') {
          // increase by +1 when user selects "New Cycle"
          nextCycle = Number(prev.cycleNumber) + 1;
        } else if (val === 'current') {
          // keep the same value
          nextCycle = prev.cycleNumber;
        }

        return {
          ...prev,
          cycleOption: val,
          cycleNumber: nextCycle,
        };
      });
    }}
    isDisabled={!canEdit}
  >
    <Radio value="current">Current ({form.cycleNumber})</Radio>
    <Radio value="new">New (+1 → {Number(form.cycleNumber) + 1})</Radio>
  </RadioGroup>
</div>


       
      </div>

      {/* Environment */}
      <div>
        <h6 className="font-bold mb-2">Environment</h6>
        <div className="grid grid-cols-4 gap-4">
          <Select
            size="sm"
            label="OS"
            selectedKeys={[form.envOS]}
            onSelectionChange={(keys) => {
              const v = Array.from(keys)[0] as string;
              setForm((s: any) => ({ ...s, envOS: v }));
            }}
            isDisabled={!canEdit}
          >
            {OS_OPTIONS.map((o) => (
              <SelectItem key={o}>{o}</SelectItem>
            ))}
          </Select>

          <Select
            size="sm"
            label="Browser"
            selectedKeys={[form.envBrowser]}
            onSelectionChange={(keys) => {
              const v = Array.from(keys)[0] as string;
              setForm((s: any) => ({ ...s, envBrowser: v }));
            }}
            isDisabled={!canEdit}
          >
            {BROWSER_OPTIONS.map((b) => (
              <SelectItem key={b}>{b}</SelectItem>
            ))}
          </Select>

          <Select
            size="sm"
            label="Env (dev/qa/uat/prod)"
            selectedKeys={[form.envName]}
            onSelectionChange={(keys) => {
              const v = Array.from(keys)[0] as string;
              setForm((s: any) => ({ ...s, envName: v }));
            }}
            isDisabled={!canEdit}
          >
            {ENV_OPTIONS.map((e) => (
              <SelectItem key={e}>{e}</SelectItem>
            ))}
          </Select>

          <Input
            size="sm"
            label="Database"
            value={form.envDatabase}
            onChange={(e) => setForm((s: any) => ({ ...s, envDatabase: e.target.value }))}
            isDisabled={!canEdit}
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
          isDisabled={!canEdit}
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
          isDisabled={!canEdit}
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
          isDisabled={!canEdit}
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
            isDisabled={!canEdit}
          />
          <Input
            size="sm"
            label="End Date"
            type="date"
            value={form.preparationEnd}
            onChange={(e) => setForm({ ...form, preparationEnd: e.target.value })}
            isDisabled={!canEdit}
          />
          <Input size="sm" label="Prepared By" value={form.preparedBy || currentUserName} isDisabled />
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
            isDisabled={!canEdit}
          />
          <Input
            size="sm"
            label="End Date"
            type="date"
            value={form.executionEnd}
            onChange={(e) => setForm({ ...form, executionEnd: e.target.value })}
            isDisabled={!canEdit}
          />
          <Input size="sm" label="Executed By" value={form.executedBy || currentUserName} isDisabled />
        </div>
      </div>

      <Divider />

      {/* Bugs + Automation testcases ids */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h6 className="font-bold mb-2">Add Bug Ids</h6>
          <BugIdsInput
            value={form.bugs}
            onChange={(bugs) => setForm({ ...form, bugs })}
            placeholder="e.g. 12345 or BUG-101 (paste supports commas)"
            isDisabled={!canEdit}
          />
        </div>
        <div>
          <h6 className="font-bold mb-2">Enhanced Test Case IDs</h6>
          <Textarea
            size="sm"
            variant="bordered"
            placeholder="Enter Enhanced Test case Ids (comma separated)"
            value={form.enhanced_test_case_id}
            onChange={(e) => setForm({ ...form, enhanced_test_case_id: e.target.value })}
            isDisabled={!canEdit}
          />
        </div>
      </div>

      <Divider />

      {/* Review & Approval */}
      <div>
        <h6 className="font-bold mb-2">Review Section</h6>
        <div className="grid grid-cols-2 gap-4">
          <Input
            size="sm"
            label="Reviewed By"
            value={form.reviewedBy || (tokenCtx.isProjectReviewer(projectIdNum) ? currentUserName : '')}
            isDisabled={!canReview}
            onChange={(e) => {
              if (canReview) setForm({ ...form, reviewedBy: e.target.value });
            }}
          />
          <Input
            size="sm"
            label="Review Date"
            type="date"
            value={form.reviewDate}
            onChange={(e) => setForm({ ...form, reviewDate: e.target.value })}
            isDisabled={!canReview}
          />
          <Textarea
            size="sm"
            variant="bordered"
            label="Reviewer Comments"
            placeholder="Reviewer notes / audit remarks"
            value={form.reviewerComments}
            onValueChange={(val) => setForm({ ...form, reviewerComments: val })}
            className="mt-3"
            isDisabled={!canReview}
          />
        </div>
      </div>

      <div>
        <h6 className="font-bold mb-2">Approval Section</h6>
        <div className="grid grid-cols-2 gap-4">
          <Input
            size="sm"
            label="Approved By"
            value={form.approvedBy || (tokenCtx.isProjectApprover(projectIdNum) ? currentUserName : '')}
            isDisabled={!canApprove}
            onChange={(e) => {
              if (canApprove) setForm({ ...form, approvedBy: e.target.value });
            }}
          />
          <Input
            size="sm"
            label="Approval Date"
            type="date"
            value={form.approvalDate}
            onChange={(e) => setForm({ ...form, approvalDate: e.target.value })}
            isDisabled={!canApprove}
          />
        </div>
        <Textarea
          size="sm"
          variant="bordered"
          label="Approver Comments"
          placeholder="Approver notes / audit remarks"
          value={form.approverComments}
          onValueChange={(val) => setForm({ ...form, approverComments: val })}
          className="mt-3"
          isDisabled={!canApprove}
        />
      </div>
<Divider />

{/* Attachments Section */}
<div>
  <h6 className="font-bold mb-2">Attachments (URLs)</h6>
  <Textarea
    size="sm"
    variant="bordered"
    placeholder="Enter comma-separated URLs (e.g., https://example.com/file1, https://example.com/file2)"
    value={form.attachments}
    onValueChange={(val) =>
      setForm({
        ...form,
        attachments: val
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .join(','),
      })
    }
    isDisabled={!canEdit}
  />

  {/* Preview the entered URLs */}
  {form.attachments && (
    <ul className="text-sm mt-2 list-disc list-inside text-blue-600 space-y-1">
      {form.attachments
        .split(',')
        .map((url: string, idx: number) => (
          <li key={idx}>
            <a
              href={url.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-primary"
            >
              {url.trim()}
            </a>
          </li>
        ))}
    </ul>
  )}
</div>

      {/* Sticky footer with conditional buttons */}
      <div className="sticky bottom-0 bg-background border-t border-border p-4 flex justify-end gap-2">
        {/* Reopen button - Lead/Manager can reopen from any state */}
        {canReopen && (
          <Button
            size="sm"
            color="warning"
            variant="bordered"
            isDisabled={saving}
            onPress={handleReopen}
          >
            {saving ? 'Processing…' : 'Reopen Test Case'}
          </Button>
        )}

        {/* Save button - Developer/Tester at state 0 or -1 */}
        {canEdit && (
          <Button
            size="sm"
            color="default"
            variant="bordered"
            isDisabled={saving || form.runId === '' || form.cycleNumber === ''}
            onPress={handleSave}
          >
            {saving ? submittingText : 'Save'}
          </Button>
        )}

        {/* Send for Review button - Developer/Tester at state 0 or -1 */}
        {canSendForReview && (
          <Button
            size="sm"
            color="primary"
            isDisabled={saving || form.runId === '' || form.cycleNumber === ''}
            onPress={handleSendForReview}
          >
            {saving ? 'Sending…' : 'Send for Review'}
          </Button>
        )}

        {/* Review buttons - Reviewer at state 1 or 2 */}
        {canReview && (
          <>
            <Button
              size="sm"
              color="danger"
              variant="bordered"
              isDisabled={saving}
              onPress={() => handleReview(false)}
            >
              {saving ? 'Processing…' : 'Reject'}
            </Button>
            <Button
              size="sm"
              color="success"
              isDisabled={saving}
              onPress={() => handleReview(true)}
            >
              {saving ? 'Processing…' : 'Send for Approval'}
            </Button>
          </>
        )}

        {/* Approval buttons - Approver at state 3 */}
        {canApprove && (
          <>
            <Button
              size="sm"
              color="warning"
              variant="bordered"
              isDisabled={saving}
              onPress={() => handleApproval(false)}
            >
              {saving ? 'Processing…' : 'Return to Review'}
            </Button>
            <Button
              size="sm"
              color="success"
              isDisabled={saving}
              onPress={() => handleApproval(true)}
            >
              {saving ? 'Processing…' : 'Approve'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
