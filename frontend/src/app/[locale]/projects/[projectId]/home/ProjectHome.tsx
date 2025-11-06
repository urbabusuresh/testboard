'use client';
import { useState, useEffect, useContext } from 'react';
import { Card, CardBody, CardHeader, Chip, Divider } from '@heroui/react';
import { Folder, Clipboard, FlaskConical } from 'lucide-react';
import { useTheme } from 'next-themes';
import { aggregateBasicInfo, aggregateTestPriority, aggregateTestType, aggregateProgress } from './aggregate';
import { HomeMessages } from './page';
import TestTypesChart from './TestTypesDonutChart';
import TestPriorityChart from './TestPriorityDonutChart';
import TestProgressBarChart from './TestProgressColumnChart';
import Config from '@/config/config';
import { TokenContext } from '@/utils/TokenProvider';
import { ProgressSeriesType } from '@/types/run';
import { title, subtitle } from '@/components/primitives';
import { TestRunCaseStatusMessages } from '@/types/status';
import { TestTypeMessages } from '@/types/testType';
import { PriorityMessages } from '@/types/priority';
import { ProjectType } from '@/types/project';
import { CasePriorityCountType, CaseTypeCountType } from '@/types/chart';
import { logError } from '@/utils/errorHandler';
import ExecutionsKpiPage from './kpis';
import UserSummaryPanel from './userWiseSummary';
import BugHistoryPage from '../folders/[folderId]/cases/[caseId]/tabs/BugsHistory';
import BugzillaReportPage from '../bugs/page';
import ProjectTestCasesSummary from './ProjectTestCasesSummary';
import ProjectTestCasesSummaryByModule from './ProjectTestCasesSummaryByModule';
import ProjectTestStatsSummary from '@/components/projectstats/getProjectTestStats';

const apiServer = Config.apiServer;

async function fetchProject(jwt: string, projectId: number) {
  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  };

  const url = `${apiServer}/home/${projectId}`;

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error: unknown) {
    logError('Error fetching data:', error);
  }
}

type Props = {
  projectId: string;
  messages: HomeMessages;
  testRunCaseStatusMessages: TestRunCaseStatusMessages;
  testTypeMessages: TestTypeMessages;
  priorityMessages: PriorityMessages;
};

export function ProjectHome({
  projectId,
  messages,
  testRunCaseStatusMessages,
  testTypeMessages,
  priorityMessages,
}: Props) {
  const context = useContext(TokenContext);
  const { theme } = useTheme();
  const [project, setProject] = useState<ProjectType>({
    id: 0,
    name: '',
    detail: '',
    isPublic: false,
    userId: 0,
    createdAt: '',
    updatedAt: '',
    Folders: [],
    Runs: [],
  });
  const [folderNum, setFolderNum] = useState(0);
  const [caseNum, setCaseNum] = useState(0);
  const [runNum, setRunNum] = useState(0);
  const [typesCounts, setTypesCounts] = useState<CaseTypeCountType[]>([]);
  const [priorityCounts, setPriorityCounts] = useState<CasePriorityCountType[]>([]);
  const [progressCategories, setProgressCategories] = useState<string[]>([]);
  const [progressSeries, setProgressSeries] = useState<ProgressSeriesType[]>([]);

  // Tab state: 0 = Executions KPIs, 1 = User KPIs
  const [activeTab, setActiveTab] = useState<number>(0);

  useEffect(() => {
    async function fetchDataEffect() {
      if (!context.isSignedIn()) {
        return;
      }

      try {
        const data = await fetchProject(context.token.access_token, Number(projectId));
        setProject(data);
      } catch (error: unknown) {
        logError('Error in effect:', error);
      }
    }

    fetchDataEffect();
  }, [context, projectId]);

  





  // small TabButton component
  const TabButton = ({ idx, label, subtitleLabel, count }: { idx: number; label: string; subtitleLabel?: string; count?: number }) => {
    const active = activeTab === idx;
    return (
      <button
        role="tab"
        aria-selected={active}
        onClick={() => setActiveTab(idx)}
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

  return (
    <div className="container mx-auto max-w-7xl pt-6 px-6 flex-grow">
      

      {/* Tabs header */}
      <div className="bg-transparent">
        <div className="flex items-end gap-2">
          <TabButton idx={0} label="Testcases Runs" subtitleLabel="Status & environment KPIs" count={/* show total executions if available */ undefined} />
          <TabButton idx={1} label="User Summary" subtitleLabel="User performance & daily trends" count={undefined} />
            <TabButton idx={2} label="Testcases Summary" subtitleLabel="Overall Testcases Status Summary" count={undefined} />
        <TabButton idx={3} label="Module Wise Summary" subtitleLabel="Overall Testcases Module Wise Summary" count={undefined} />
        
        </div>

        <div className="border rounded-b-md p-4 bg-white mt-2 shadow-sm">
          {/* Tab panels: lazy-render to avoid mounting both heavy components */}
          {activeTab === 0 && (
            <section aria-label="Testcases Runs" role="tabpanel">
              <ExecutionsKpiPage projectId={projectId} />
            </section>
          )}

          {activeTab === 1 && (
            <section aria-label="User Summary" role="tabpanel">
              <UserSummaryPanel projectId={projectId} />
            </section>
          )}

           {activeTab === 2 && (
            <section aria-label="Testcases Summary" role="tabpanel">
               <ProjectTestCasesSummary projectIdNum={projectId} /> 
            </section> )}

            {activeTab === 3 && (
            <section aria-label="Module Wise Summary" role="tabpanel">
              {/* <ProjectTestCasesSummary /> */}
              <ProjectTestCasesSummaryByModule projectIdNum={projectId}/>
            </section>
          )}
        </div>
      </div>

      {/* Optional additional charts below tabs */}
      <Divider className="my-12" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Test Types</div>
                <div className="text-xs text-gray-500">Breakdown by type</div>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <TestTypesChart data={typesCounts} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <div className="text-sm font-semibold">Case Priority</div>
              <div className="text-xs text-gray-500">Priority distribution</div>
            </div>
          </CardHeader>
          <CardBody>
            <TestPriorityChart data={priorityCounts} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <div className="text-sm font-semibold">Progress</div>
              <div className="text-xs text-gray-500">Execution progress per run</div>
            </div>
          </CardHeader>
          <CardBody>
            <TestProgressBarChart series={progressSeries} categories={progressCategories} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
