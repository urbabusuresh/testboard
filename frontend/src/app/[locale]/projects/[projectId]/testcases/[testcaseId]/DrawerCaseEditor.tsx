"use client";

import React, { useState, useEffect, useContext } from "react";
import {
  Tabs,
  Tab,
  Tooltip,
  Button,
  Badge,
  Spinner,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
} from "@heroui/react";
import {
  ArrowLeft,
  Save,
  FileText,
  ListChecks,
  BugIcon,
  TestTubeDiagonalIcon,
} from "lucide-react";
import { useRouter } from "@/src/i18n/routing";
import { TokenContext } from "@/utils/TokenProvider";
import { useFormGuard } from "@/utils/formGuard";
import { fetchCase, updateCase } from "@/utils/caseControl";
import { logError } from "@/utils/errorHandler";

import BasicInfoForm from "./tabs/BasicInfoForm";
import StepsForm from "./tabs/StepsForm";
import ExecutionsWorkspace from "./executionRuns/ExecutionsWorkspace";
import BugHistoryPage from "./tabs/BugsHistory";
import CasesClient from "../../automation/cases/ui";
import RunsClient from "../../automation/runs/ui";
import { CaseType, TestCase } from "@/types/testcaseModel";

const defaultTestCase: CaseType = {
  id: 0,
  externalId: "",
  projectId: undefined,
  scenarioId: null,
  scenarioExternalId: null,
  title: "",
  description: "",
  caseType: "",
  priority: "",
  testType: "",
  status: undefined,
  spoc: "",
  bugId: "",
  link: "",
  preConditions: "",
  steps: [],
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
  attachments: [],
  isIncluded: false,
  runStatus: "",
  automationIds: [],
  requirementId: "",
  moduleName: "",
};

type DrawerCaseEditorProps = {
  projectId: any;
  caseId: string | number;
  testScenarioId: string;
  buildId: string | number;
  locale: string;
  isOpen: boolean;
  onClose: () => void;
  messages: {
    backToCases: string;
    updating: string;
    update: string;
    updatedTestCase: string;
  };
};

export default function DrawerCaseEditor({
  projectId,
  caseId,
  testScenarioId,
  buildId,
  locale,
  isOpen,
  onClose,
  messages,
}: DrawerCaseEditorProps) {
  const tokenContext = useContext(TokenContext);
  const router = useRouter();

  const [testCase, setTestCase] = useState<CaseType>(defaultTestCase);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useFormGuard(isDirty, "Update Testcase");

  // Fetch testcase data
  useEffect(() => {
    async function fetchData() {
      if (!tokenContext.isSignedIn()) return;
      try {
        const data = await fetchCase(tokenContext.token.access_token, Number(caseId));
        const model = TestCase.fromApi(data);
        setTestCase(model.data);
      } catch (err) {
        logError("Error fetching case data", err);
      }
    }
    fetchData();
  }, [caseId, tokenContext]);

  const handleSave = async () => {
    setIsUpdating(true);
    await updateCase(tokenContext.token.access_token, testCase);
    setIsUpdating(false);
    setIsDirty(false);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      placement="right"
      className="!w-[80vw] md:!w-[80vw] sm:!w-full !h-screen max-w-none overflow-hidden"
      backdrop="blur"
      motionProps={{
        initial: { opacity: 0, x: 100 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 100 },
      }}
    >
      <DrawerContent className="flex flex-col h-screen bg-white border-l border-gray-200 shadow-2xl rounded-l-xl">
        {/* ===== Header ===== */}
        <DrawerHeader className="flex justify-between items-center border-b bg-gray-50 px-2 py-4 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Tooltip content='Back to Cases'>
              <Button
                isIconOnly
                size="sm"
                className="rounded-full bg-neutral-50 hover:bg-neutral-100"
                onPress={onClose}
              >
                <ArrowLeft size={16} />
              </Button>
            </Tooltip>
            <h3 className="font-bold text-gray-800 truncate max-w-[400px]">
              {testCase.title || "Loading..."}
            </h3>
          </div>
          <Button
            startContent={
              <Badge
                isInvisible={!isDirty}
                color="danger"
                size="sm"
                content=""
                shape="circle"
              >
                <Save size={16} />
              </Badge>
            }
            size="sm"
            color="primary"
            isLoading={isUpdating}
            onPress={handleSave}
          >
            {isUpdating ? 'updating..' : 'update'}
          </Button>
        </DrawerHeader>

        {/* ===== Body ===== */}
        <DrawerBody className="flex-1 overflow-hidden bg-white">
          {testCase ? (
            <div className="h-full overflow-y-auto  scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
              <Tabs aria-label="Case Editor" className="p-1">
                <Tab
                  key="basic"
                  title={
                    <span className="flex items-center">
                      <FileText size={16} className="mr-2" /> Basic
                    </span>
                  }
                >
                  <BasicInfoForm testCase={testCase} setTestCase={setTestCase} />
                </Tab>

                <Tab
                  key="steps"
                  title={
                    <span className="flex items-center">
                      <ListChecks size={16} className="mr-2" /> Steps
                    </span>
                  }
                >
                  <StepsForm testCase={testCase} setTestCase={setTestCase} />
                </Tab>

                <Tab
                  key="testbuild"
                  title={
                    <span className="flex items-center">
                      <TestTubeDiagonalIcon size={16} className="mr-2" /> Test Build
                    </span>
                  }
                >
                  <ExecutionsWorkspace
                    projectId={projectId.toString()}
                    buildId={buildId}
                    caseId={caseId.toString()}
                  />
                </Tab>

                <Tab
                  key="bugs"
                  title={
                    <span className="flex items-center">
                      <BugIcon size={16} className="mr-2" /> Bugs
                    </span>
                  }
                >
                  <BugHistoryPage caseId={caseId.toString()} />
                </Tab>

                <Tab key="automationcases" title="Automation Testcases">
                  <CasesClient
                    projectIdProp={projectId}
                    runId="undefined"
                    queryType="byCase"
                    caseId={testCase.externalId ?? ""}
                  />
                </Tab>

                <Tab key="automationruns" title="Automation Test Runs">
                  <RunsClient
                    projectIdProp={projectId}
                    runId="undefined"
                    queryType="byCase"
                    caseId={testCase.externalId ?? ""}
                  />
                </Tab>
              </Tabs>
            </div>
          ) : (
            <div className="flex justify-center items-center h-full">
              <Spinner size="lg" />
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
