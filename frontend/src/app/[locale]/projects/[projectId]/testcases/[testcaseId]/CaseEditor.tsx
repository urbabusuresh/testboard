'use client';
import { useState, useEffect, useContext } from 'react';
import { Tabs, Tab, Tooltip, Button, Badge, addToast, Autocomplete } from '@heroui/react';
import { ArrowLeft, Save, FileText, Server, ListChecks, Paperclip, History, BugIcon, FileCode2Icon, FileCode, LucideFileCode2, Workflow, TestTube2, TestTubeDiagonalIcon } from 'lucide-react';
import { useRouter } from '@/src/i18n/routing';
import { TokenContext } from '@/utils/TokenProvider';
import { useFormGuard } from '@/utils/formGuard';
import { fetchCase, updateCase } from '@/utils/caseControl';
import { updateSteps } from './stepControl';
import { CaseIntent, CaseType, StepType } from '@/types/testcaseModel';
import { logError } from '@/utils/errorHandler';

// Sub components
import BasicInfoForm from './tabs/BasicInfoForm';
import StepsForm from './tabs/StepsForm';
import AttachmentsForm from './tabs/AttachmentsForm';
import TestHistory from './tabs/TestHistory';
import ExecutionsWorkspace from './executionRuns/ExecutionsWorkspace';
import BugHistoryPage from './tabs/BugsHistory';
import { TestCase } from "@/types/testcaseModel";
import { CaseMessages } from '@/types/case';
import CasesClient from '../../automation/cases/ui';
import RunsClient from '../../automation/runs/ui';
const defaultTestCase: CaseType = {
  id: 0,
  externalId: "",
  projectId: undefined,

  scenarioId: null,
  scenarioExternalId: null,

  title: "",
  description: "",

  caseType: "",
  priority: '',
  testType: "",

  status: undefined,
  spoc: "",
  bugId: "",
  link: "",

  preConditions: "",
  steps: [],                // ✅ should be an array of StepType
  rawSteps: "",
  testData: null,
  expectedResults: "",
  actualResult: "",

  iteration: "",
  remarks: "",
  count: "",
  traceability: null,
  testers: [],
  createdAt: null,
  updatedAt: null,
  deletedAt: null,

  stepsObjects: [],
  runCases: null,
  attachments: [],          // ✅ lowercase field name

  isIncluded: false,
  runStatus: "",

  automationIds: [],        // ✅ array, not number
  requirementId: "",
  moduleName: "",
};


type Props = {
  projectId: string;
  caseId: string;
  testScenarioId:string;
  messages: CaseMessages;
  locale: string;
  buildId:string|number;
};

export default function CaseEditor({ projectId, caseId, testScenarioId,messages, locale,buildId }: Props) {
  
  const tokenContext = useContext(TokenContext);
  const [testCase, setTestCase] = useState<CaseType>(defaultTestCase);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const router = useRouter();

  useFormGuard(isDirty, messages.areYouSureLeave);

  // fetch data
  useEffect(() => {
    async function fetchData() {
      if (!tokenContext.isSignedIn()) return;
      try {
        const data = await fetchCase(tokenContext.token.access_token, Number(caseId));
       // data.Steps.forEach((s: StepType) => (s.editState = 'notChanged'));
       const model = TestCase.fromApi(data);
       //console.log('Fetched case data:', model.data);
        setTestCase(model.data);

      } catch (err) {
        logError('Error fetching case data', err);
      }
    }
    fetchData();
  }, [caseId, tokenContext]);

  return (
    <>
      {/* Header */}
      <div className="border-b p-3 bg-pink-50 flex items-center justify-between">
        <div className="flex items-center">
          <Tooltip content={messages.backToCases}>
            <Button
              isIconOnly
              size="sm"
              className="rounded-full bg-neutral-50 dark:bg-neutral-600"
              onPress={() => router.push(`/projects/${projectId}/testcases?ts=${testScenarioId}`, { locale })}
            >
              <ArrowLeft size={16} />
            </Button>
          </Tooltip>
          <h3 className="font-bold ms-2">{testCase.title}</h3>
        </div>
        <Button
          startContent={
            <Badge isInvisible={!isDirty} color="danger" size="sm" content="" shape="circle">
              <Save size={16} />
            </Badge>
          }
          size="sm"
          color="primary"
          isLoading={isUpdating}
          onPress={async () => {
            setIsUpdating(true);
            await updateCase(tokenContext.token.access_token, testCase);
           // if (testCase.rawSteps) await updateSteps(tokenContext.token.access_token, Number(caseId), testCase);
            addToast({ title: 'Info', description: messages.updatedTestCase });
            setIsUpdating(false);
            setIsDirty(false);
          }}
        >
          {isUpdating ? messages.updating : messages.update}
        </Button>
      </div>
      <div className='bg-gray-50 border'>
      {/* Tabs */}
      <Tabs aria-label="Case Editor" className="p-1">
        <Tab key="basic" title={<span className="flex items-center"><FileText size={16} className="mr-2" /> Basic</span>}>
          <BasicInfoForm testCase={testCase} setTestCase={setTestCase} />
        </Tab>
        {/* <Tab key="env" title={<span className="flex items-center"><Server size={16} className="mr-2" /> Env</span>}>
          <EnvironmentForm testCase={testCase} setTestCase={setTestCase} />
        </Tab> */}
        <Tab key="steps" title={<span className="flex items-center"><ListChecks size={16} className="mr-2" /> Steps</span>}>
          <StepsForm testCase={testCase} setTestCase={setTestCase} />
        </Tab>
        {/* <Tab key="attachments" title={<span className="flex items-center"><Paperclip size={16} className="mr-2" /> Attachments</span>}>
          <AttachmentsForm testCase={testCase} setTestCase={setTestCase} />
        </Tab> */}
        
         <Tab key="testbuild" title={<span className="flex items-center"><TestTubeDiagonalIcon size={16} className="mr-2" /> Test Build</span>}>
          
           <ExecutionsWorkspace
      projectId={projectId}
      buildId={buildId}
      caseId={caseId}
    />
        </Tab>
        
         <Tab key="Bugs" title={<span className="flex items-center"><BugIcon size={16} className="mr-2" /> Bugs</span>}>
          <BugHistoryPage caseId={caseId} />
        </Tab>
         {/* <Tab key="automationtests" title={<span className="flex items-center"><Workflow size={16} className="mr-2" /> Automation Tests</span>}>
          <TestHistory caseId={caseId} />
        </Tab> */}
         <Tab key="automationcases" title="Automation Testcases">
                     <CasesClient projectIdProp={projectId} runId='undefined' queryType='byCase' caseId={testCase.externalId ?? ''} />
                  </Tab>
                  <Tab key="automationruns" title="Automation Test Runs">
                     <RunsClient projectIdProp={projectId} runId='undefined' queryType='byCase' caseId={testCase.externalId ?? ''}  />
                  </Tab>
      </Tabs></div>
    </>
  );
}
