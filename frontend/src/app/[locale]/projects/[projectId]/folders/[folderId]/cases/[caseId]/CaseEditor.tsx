'use client';
import { useState, useEffect, useContext } from 'react';
import { Tabs, Tab, Tooltip, Button, Badge, addToast, Autocomplete } from '@heroui/react';
import { ArrowLeft, Save, FileText, Server, ListChecks, Paperclip, History, BugIcon, FileCode2Icon, FileCode, LucideFileCode2, Workflow, TestTube2, TestTubeDiagonalIcon } from 'lucide-react';
import { useRouter } from '@/src/i18n/routing';
import { TokenContext } from '@/utils/TokenProvider';
import { useFormGuard } from '@/utils/formGuard';
import { fetchCase, updateCase } from '@/utils/caseControl';
import { updateSteps } from './stepControl';
import { CaseType, CaseMessages, StepType } from '@/types/case';
import { logError } from '@/utils/errorHandler';

// Sub components
import BasicInfoForm from './tabs/BasicInfoForm';
import StepsForm from './tabs/StepsForm';
import AttachmentsForm from './tabs/AttachmentsForm';
import TestHistory from './tabs/TestHistory';
import ExecutionsWorkspace from './executionRuns/ExecutionsWorkspace';
import BugHistoryPage from './tabs/BugsHistory';

const defaultTestCase: CaseType = {
  id: 0,
  title: '',
  state: 0,
  priority: 0,
  type: 0,
  automationStatus: 0,
  description: '',
  template: 0,
  preConditions: '',
  expectedResults: '',
  folderId: 0,
  Steps: [],
  Attachments: [],
  isIncluded: false,
  runStatus: 0,
  caseType: 0,
  automationIds: [],
  requirementId: '',
  moduleName: ''
};

type Props = {
  projectId: string;
  folderId: string;
  caseId: string;
  messages: CaseMessages;
  locale: string;
};

export default function CaseEditor({ projectId, folderId, caseId, messages, locale }: Props) {
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
        data.Steps.forEach((s: StepType) => (s.editState = 'notChanged'));
        setTestCase({ ...defaultTestCase, ...data });
      } catch (err) {
        logError('Error fetching case data', err);
      }
    }
    fetchData();
  }, [caseId, tokenContext]);

  return (
    <>
      {/* Header */}
      <div className="border-b p-3 flex items-center justify-between">
        <div className="flex items-center">
          <Tooltip content={messages.backToCases}>
            <Button
              isIconOnly
              size="sm"
              className="rounded-full bg-neutral-50 dark:bg-neutral-600"
              onPress={() => router.push(`/projects/${projectId}/folders/${folderId}/cases`, { locale })}
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
            if (testCase.Steps) await updateSteps(tokenContext.token.access_token, Number(caseId), testCase.Steps);
            addToast({ title: 'Info', description: messages.updatedTestCase });
            setIsUpdating(false);
            setIsDirty(false);
          }}
        >
          {isUpdating ? messages.updating : messages.update}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs aria-label="Case Editor" className="p-5">
        <Tab key="basic" title={<span className="flex items-center"><FileText size={16} className="mr-2" /> Basic</span>}>
          <BasicInfoForm testCase={testCase} setTestCase={setTestCase} />
        </Tab>
        {/* <Tab key="env" title={<span className="flex items-center"><Server size={16} className="mr-2" /> Env</span>}>
          <EnvironmentForm testCase={testCase} setTestCase={setTestCase} />
        </Tab> */}
        <Tab key="steps" title={<span className="flex items-center"><ListChecks size={16} className="mr-2" /> Steps</span>}>
          <StepsForm testCase={testCase} setTestCase={setTestCase} />
        </Tab>
        <Tab key="attachments" title={<span className="flex items-center"><Paperclip size={16} className="mr-2" /> Attachments</span>}>
          <AttachmentsForm testCase={testCase} setTestCase={setTestCase} />
        </Tab>
        
         <Tab key="testbuild" title={<span className="flex items-center"><TestTubeDiagonalIcon size={16} className="mr-2" /> Test Build</span>}>
          
           <ExecutionsWorkspace
      projectId={projectId}
      folderId={folderId}
      caseId={caseId}
    />
        </Tab>
        
         <Tab key="Bugs" title={<span className="flex items-center"><BugIcon size={16} className="mr-2" /> Bugs</span>}>
          <BugHistoryPage caseId={caseId} />
        </Tab>
         <Tab key="automationtests" title={<span className="flex items-center"><Workflow size={16} className="mr-2" /> Automation Tests</span>}>
          <TestHistory caseId={caseId} />
        </Tab>
      </Tabs>
    </>
  );
}
