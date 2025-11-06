'use client';

import { useState, useEffect, useContext, useRef } from 'react';
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Tooltip,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  ButtonGroup,
  Badge,
  Tabs,
  Tab,
  Card,
  CardHeader,
  CardBody,
  Divider,
  Chip,
} from '@heroui/react';
import {
  Save,
  ArrowLeft,
  ChevronDown,
  FileDown,
  FileSpreadsheet,
  FileCode,
  FileJson,
  Edit3,
  Lock,
  Unlock,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { fetchRun, updateRun, exportRun } from '../runsControl';
import { useRouter } from '@/src/i18n/routing';
import { testRunStatus } from '@/config/selection';
import { RunType, RunStatusCountType, RunMessages } from '@/types/run';
import { TokenContext } from '@/utils/TokenProvider';
import { useFormGuard } from '@/utils/formGuard';
import { logError } from '@/utils/errorHandler';
import { ProjectHome } from '../../home/ProjectHome';
import { Editor } from '@tinymce/tinymce-react';
import TestCasesClient from '@/components/testcases/TestCasesClient';
import TestCasesByRuns from '@/components/testcases/TestCasesByRuns';
import BugsHistory from '../../bugs/BugsHistory';
import CasesClient from '../../automation/cases/ui';
import RunsClient from '../../automation/runs/ui';
import TestSummaryDashboard from './TestSummaryDashboard';
import ExecutionsKpiPage from '../../home/kpis';
import ProjectTestCasesSummaryByModule from '../../home/ProjectTestCasesSummaryByModule';
import ProjectTestCasesSummary from '../../home/ProjectTestCasesSummary';
import UserSummaryPanel from '../../home/userWiseSummary';

const defaultRun: RunType = {
  id: 0,
  name: '',
  configurations: 0,
  description: '',
  state: 0,
  projectId: 0,
  createdAt: '',
  updatedAt: '',
  startDate: '',
  endDate: '',
  tc_id: '',
  env: '',
  createdBy: '',
  sprintId: '',
  documentLink: '',
  releaseNotes: '',
  comments: '',
  server: '',
};

type Props = {
  projectId: string;
  runId: string;
  messages: RunMessages;
  runStatusMessages: any;
  testRunCaseStatusMessages: any;
  priorityMessages: any;
  testTypeMessages: any;
  locale: string;
};

export default function RunEditor({
  projectId,
  runId,
  messages,
  runStatusMessages,
  testRunCaseStatusMessages,
  priorityMessages,
  testTypeMessages,
  locale,
}: Props) {
   const [activeTabKPI, setActiveTabKPI] = useState<number>(0);
  
  const editorRef = useRef<any>(null);
  const tokenCtx = useContext(TokenContext);
  const { theme } = useTheme();
  const router = useRouter();

  const [run, setRun] = useState<RunType>(defaultRun);
  const [runStatusCounts, setRunStatusCounts] = useState<RunStatusCountType[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('history');
  const [exportType, setExportType] = useState(new Set(['xml']));
  const [isEditMode, setIsEditMode] = useState(false);

  useFormGuard(isDirty, messages.areYouSureLeave);

  // Fetch Run + Status
  const fetchRunAndStatus = async () => {
    const { run, statusCounts } = await fetchRun(tokenCtx.token.access_token, Number(runId));
    setRun(run);
    setRunStatusCounts(statusCounts);
  };

  const handleSave = async () => {
    if (!validateDates()) return;
    setIsUpdating(true);
    await updateRun(tokenCtx.token.access_token, run);
    setIsUpdating(false);
    setIsDirty(false);
    setIsEditMode(false);
  };

  const validateDates = () => {
    const start = new Date(run.startDate);
    const end = new Date(run.endDate);
    if (start > end) {
      alert('❌ End Date must be after Start Date.');
      return false;
    }
    return true;
  };

  const isPastStartDate = () => new Date(run.endDate) <= new Date();

  const isClosedStatus = () => {
  const closedStatus = testRunStatus.find(
    (s) => s.uid.toLowerCase() === "closed" 
  );
  if (!closedStatus) return false;
  return run.state === testRunStatus.indexOf(closedStatus);
};



  useEffect(() => {
    if (tokenCtx.isSignedIn()) fetchRunAndStatus().catch((e) => logError('fetchRun', e));
  }, [tokenCtx]);

  const handleExportTypeChange = (keys: any) =>
    setExportType(new Set(Array.from(keys as Set<string>)));


   const TabButton = ({ idx, label, subtitleLabel, count }: { idx: number; label: string; subtitleLabel?: string; count?: number }) => {
    const active = activeTabKPI === idx;
    return (
      <button
        role="tab"
        aria-selected={active}
        onClick={() => setActiveTabKPI(idx)}
        className={`px-4 py-2 rounded-t-md border-b-2 ${active ? 'border-blue-600 bg-white' : 'border-transparent bg-gray-50 hover:bg-gray-100'} focus:outline-none`}
      >
        <div className="flex items-center gap-3">
          <div>
            <div className={`text-sm font-semibold ${active ? 'text-gray-900' : 'text-gray-700'}`}>{label}</div>
            {subtitleLabel && <div className="text-xs text-gray-500">{subtitleLabel}</div>}
          </div>
          {typeof count === 'number' && (
            <div className="ml-2">
              <Chip variant="flat" className="px-2 py-0.5 bg-gray-100 text-xs">{count}</Chip>
            </div>
          )}
        </div>
      </button>
    );
  };

  // UI ————————————————————————————————————————
  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="border-b p-3 flex items-center justify-between bg-content1">
        <div className="flex items-center gap-2">
          <Tooltip content={messages.backToRuns}>
            <Button
              isIconOnly
              size="sm"
              className="rounded-full"
              onPress={() => router.push(`/projects/${projectId}/runs`, { locale })}
            >
              <ArrowLeft size={16} />
            </Button>
          </Tooltip>
          <h3 className="font-semibold text-lg">
  {run.name || 'Test Run'}{' '}
  {isClosedStatus() && (
    <Chip color="danger" variant="flat" size="sm">
      Locked (Closed)
    </Chip>
  )}
</h3>

        </div>

        <div className="flex items-center gap-2">
          <Tooltip
  content={
    isClosedStatus()
      ? 'Editing is locked because this run is Closed'
      : isEditMode
      ? 'Disable Edit Mode'
      : 'Enable Edit Mode'
  }
>
  <Button
    isIconOnly
    variant="light"
    color={isEditMode ? 'danger' : 'success'}
    onPress={() => setIsEditMode(!isEditMode)}
    isDisabled={isClosedStatus()}
  >
    {isEditMode ? <Lock size={16} /> : <Unlock size={16} />}
  </Button>
</Tooltip>


          <ButtonGroup>
            <Button
              startContent={<FileDown size={16} />}
              size="sm"
              onPress={() =>
                exportRun(tokenCtx.token.access_token, Number(run.id), Array.from(exportType)[0])
              }
            >
              Export {Array.from(exportType)[0]}
            </Button>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button isIconOnly size="sm">
                  <ChevronDown size={16} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Export options"
                selectedKeys={exportType}
                selectionMode="single"
                onSelectionChange={handleExportTypeChange}
              >
                <DropdownItem key="xml" startContent={<FileCode size={16} />}>
                  XML
                </DropdownItem>
                <DropdownItem key="json" startContent={<FileJson size={16} />}>
                  JSON
                </DropdownItem>
                <DropdownItem key="csv" startContent={<FileSpreadsheet size={16} />}>
                  CSV
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </ButtonGroup>

          <Button
            startContent={
              <Badge isInvisible={!isDirty} color="danger" size="sm" content="" shape="circle">
                <Save size={16} />
              </Badge>
            }
            size="sm"
            color="primary"
            onPress={handleSave}
            isDisabled={!isEditMode || isClosedStatus()}
            isLoading={isUpdating}
          >
            {isUpdating ? messages.updating : messages.update}
          </Button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-grow overflow-auto p-1">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(k) => setActiveTab(k.toString())}
          color="primary"
          variant="solid"
        >

          
          {/* HISTORY TAB */}
          <Tab key="history" title="Run History">
            <div className="p-2 bg-content2 rounded-xl shadow-sm">
              <h4 className="font-semibold mb-4">Test Run History</h4>
              
             {/* Tabs header */}
                  <div className="bg-transparent">
                    <div className="flex items-end gap-2">
                       <TabButton idx={0} label="Overall Summary" subtitleLabel="simple view" count={/* show total executions if available */ undefined} />
                     
                      <TabButton idx={1} label="Testcases Runs" subtitleLabel="Status & environment KPIs" count={/* show total executions if available */ undefined} />
                      <TabButton idx={2} label="User Summary" subtitleLabel="User performance & daily trends" count={undefined} />
                        <TabButton idx={3} label="Testcases Summary" subtitleLabel="Overall Testcases Status Summary" count={undefined} />
                    <TabButton idx={4} label="Module Wise Summary" subtitleLabel="Overall Testcases Module Wise Summary" count={undefined} />
                    
                    </div>
            
                    <div className="border rounded-b-md p-4 bg-white mt-2 shadow-sm">
                       {activeTabKPI === 0 && (
                        <section aria-label="Overall Summary" role="tabpanel">
                          <TestSummaryDashboard
              projectId={projectId}
              runId={runId}
              runInfo={run}
            />
                        </section>
                      )}
                       
                      {/* Tab panels: lazy-render to avoid mounting both heavy components */}
                      {activeTabKPI === 1 && (
                        <section aria-label="Testcases Runs" role="tabpanel">
                          <ExecutionsKpiPage projectId={projectId} buildId={runId}/>
                        </section>
                      )}
            
                      {activeTabKPI === 2 && (
                        <section aria-label="User Summary" role="tabpanel">
                          <UserSummaryPanel projectId={projectId} buildId={runId}/>
                        </section>
                      )}
            
                       {activeTabKPI === 3 && (
                        <section aria-label="Testcases Summary" role="tabpanel">
                           <ProjectTestCasesSummary projectIdNum={projectId} buildId={runId}/> 
                        </section> )}
            
                        {activeTabKPI === 4 && (
                        <section aria-label="Module Wise Summary" role="tabpanel">
                          {/* <ProjectTestCasesSummary /> */}
                          <ProjectTestCasesSummaryByModule projectIdNum={projectId} buildId={runId}/>
                        </section>
                      )}
                    </div>
                  </div>
            </div>
          </Tab>

          {/* SUMMARY */}
          <Tab key="summary" title="Summary & Configuration">
            <Card className="shadow-sm">
              <CardBody className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    isReadOnly={!isEditMode}
                    label="Title"
                    value={run.name}
                    onChange={(e) => setRun({ ...run, name: e.target.value })}
                  />
                  <Input
                    isReadOnly={!isEditMode}
                    label="Sprint ID"
                    value={run.sprintId}
                    onChange={(e) => setRun({ ...run, sprintId: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-5 gap-3">
                  <Input
                    isReadOnly={!isEditMode}
                    label="Environment"
                    value={run.env}
                    onChange={(e) => setRun({ ...run, env: e.target.value })}
                  />
                  <Input
                    isReadOnly={!isEditMode}
                    label="Server"
                    value={run.server}
                    onChange={(e) => setRun({ ...run, server: e.target.value })}
                  />
                  <Select
                    isDisabled={!isEditMode}
                    label="Status"
                    selectedKeys={[testRunStatus[run.state].uid]}
                    onSelectionChange={(newSel) => {
                      const selectedUid = Array.from(newSel)[0];
                      const index = testRunStatus.findIndex((s) => s.uid === selectedUid);
                      setRun({ ...run, state: index });
                    }}
                  >
                    {testRunStatus.map((status) => (
                      <SelectItem key={status.uid}>{runStatusMessages[status.uid]}</SelectItem>
                    ))}
                  </Select>
                  <Input
                    type="date"
                    isReadOnly={!isEditMode}
                    label="Start Date"
                    value={run.startDate?.slice(0, 10) || ''}
                    onChange={(e) => setRun({ ...run, startDate: e.target.value })}
                  />
                  <Input
                    type="date"
                    isReadOnly={!isEditMode}
                    label="End Date"
                    value={run.endDate?.slice(0, 10) || ''}
                    onChange={(e) => setRun({ ...run, endDate: e.target.value })}
                  />
                </div>

                <Textarea
                  label="Description"
                  isReadOnly={!isEditMode}
                  value={run.description}
                  onValueChange={(v) => setRun({ ...run, description: v })}
                />

                <Textarea
                  label="Document Link"
                  isReadOnly={!isEditMode}
                  value={run.documentLink}
                  onValueChange={(v) => setRun({ ...run, documentLink: v })}
                />

                <Textarea 
                 label="Testcase IDs" 
                 isReadOnly={!isEditMode}
                 placeholder="Comma-separated, e.g. TS_01, TS_02"
                 size="sm" variant="bordered" 
                 value={(run as any).tc_id || ''} 
                 onValueChange={(v) => setRun({ ...run, tc_id: v })} 
                 />

              </CardBody>
            </Card>
          </Tab>

          {/* TESTCASES */}
          <Tab key="cases" title="Run Testcases">
            <TestCasesByRuns projectIdProp={projectId} runId={runId}/>
           
          </Tab>
          <Tab key="automationcases" title="Automation Testcases">
             <CasesClient projectIdProp={projectId} runId={runId} />
          </Tab>
          <Tab key="automationruns" title="Automation Test Runs">
             <RunsClient projectIdProp={projectId} runId={runId} />
          </Tab>
          {/* BUGS TAB */}
          <Tab key="bugs" title="Bugs & Defects">
            
              {/* TODO: Integrate bug list with filters */}
              <BugsHistory runId={runId}/>
            
          </Tab>

          {/* COMMENTS & NOTES TAB */}
          <Tab key="notes" title="Release Notes">
            <div className="space-y-6">
              
                  <Editor
                    tinymceScriptSrc="/tinymce/tinymce.min.js"
                    disabled={!isEditMode}
                    value={run.releaseNotes}
                    onEditorChange={(newContent: any) =>
                      setRun({ ...run, releaseNotes: newContent })
                    }
                    init={{
                     license_key: 'gpl', height: 400, menubar: true, plugins: 'advlist autolink lists link image charmap preview anchor ' + 'searchreplace code fullscreen insertdatetime media table help wordcount', toolbar: 'undo redo | formatselect | bold italic underline strikethrough forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | ' + 'table image link media | removeformat | help', skin_url: '/tinymce/skins/ui/oxide', content_css: '/tinymce/skins/content/default/content.css', }}
                  />
               
            </div>
          </Tab>

          
          {/* COMMENTS & NOTES TAB */}
          <Tab key="comments" title="Comments">
            <div className="space-y-6">
              

                  <Editor
                    tinymceScriptSrc="/tinymce/tinymce.min.js"
                    disabled={!isEditMode}
                    value={run.comments}
                    onEditorChange={(newContent:any) =>
                      setRun({ ...run, comments: newContent })
                    }
                    init={{
                     license_key: 'gpl', height: 400, menubar: true, plugins: 'advlist autolink lists link image charmap preview anchor ' + 'searchreplace code fullscreen insertdatetime media table help wordcount', toolbar: 'undo redo | formatselect | bold italic underline strikethrough forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | ' + 'table image link media | removeformat | help', skin_url: '/tinymce/skins/ui/oxide', content_css: '/tinymce/skins/content/default/content.css', }}
                  />
               
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
