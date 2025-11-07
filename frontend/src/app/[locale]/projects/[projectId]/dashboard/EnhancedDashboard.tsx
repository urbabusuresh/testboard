'use client';

import { useState, useEffect, useContext } from 'react';
import { Card, CardBody, CardHeader, Chip, Progress, Spinner } from '@heroui/react';
import { 
  Clipboard, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Target,
  UserCheck 
} from 'lucide-react';
import Config from '@/config/config';
import { TokenContext } from '@/utils/TokenProvider';

const apiServer = Config.apiServer;

type DashboardMetrics = {
  projectId: number;
  testCases: {
    total: number;
    assigned: number;
    unassigned: number;
    byWorkflowStatus: Array<{ workflowStatus: string; count: number }>;
    byPriority: Array<{ priority: number; count: number }>;
    automated: number;
    automationCoverage: string;
  };
  testRuns: {
    total: number;
    active: number;
    completed: number;
  };
  team: {
    totalMembers: number;
    workloadDistribution: Array<any>;
  };
  testCoverage: {
    totalRequirements: number;
    coveredRequirements: number;
  };
};

type Props = {
  projectId: string;
};

export function EnhancedDashboard({ projectId }: Props) {
  const context = useContext(TokenContext);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics();
  }, [projectId]);

  async function fetchDashboardMetrics() {
    if (!context.isSignedIn()) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${apiServer}/api/dashboard/metrics?projectId=${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${context.token.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  const getWorkflowStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Draft',
      ready: 'Ready',
      'in-progress': 'In Progress',
      review: 'Review',
      completed: 'Completed',
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: number) => {
    const labels: Record<number, string> = {
      1: 'Critical',
      2: 'High',
      3: 'Medium',
      4: 'Low',
    };
    return labels[priority] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center text-gray-500 py-8">
        No metrics available
      </div>
    );
  }

  const assignmentProgress = metrics.testCases.total > 0
    ? (metrics.testCases.assigned / metrics.testCases.total) * 100
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clipboard className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Test Cases</p>
              <p className="text-2xl font-bold">{metrics.testCases.total}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle2 className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold">
                {metrics.testCases.byWorkflowStatus.find(s => s.workflowStatus === 'completed')?.count || 0}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold">
                {metrics.testCases.byWorkflowStatus.find(s => s.workflowStatus === 'in-progress')?.count || 0}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Team Members</p>
              <p className="text-2xl font-bold">{metrics.team.totalMembers}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Assignment Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck size={20} />
            <h3 className="text-lg font-semibold">Test Case Assignment Progress</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Assigned: {metrics.testCases.assigned}</span>
              <span>Unassigned: {metrics.testCases.unassigned}</span>
            </div>
            <Progress
              value={assignmentProgress}
              color={assignmentProgress > 80 ? 'success' : assignmentProgress > 50 ? 'warning' : 'danger'}
              className="max-w-full"
            />
            <p className="text-sm text-gray-600">
              {assignmentProgress.toFixed(1)}% of test cases are assigned
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Workflow Status Distribution */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp size={20} />
            <h3 className="text-lg font-semibold">Workflow Status Distribution</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {metrics.testCases.byWorkflowStatus.map((status) => (
              <div key={status.workflowStatus} className="text-center">
                <div className="text-2xl font-bold text-blue-600">{status.count}</div>
                <div className="text-sm text-gray-600">
                  {getWorkflowStatusLabel(status.workflowStatus)}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Priority Distribution */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <h3 className="text-lg font-semibold">Priority Distribution</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.testCases.byPriority.map((priority) => (
              <div key={priority.priority} className="text-center">
                <Chip
                  size="lg"
                  color={
                    priority.priority === 1 ? 'danger' :
                    priority.priority === 2 ? 'warning' :
                    priority.priority === 3 ? 'primary' : 'default'
                  }
                  variant="flat"
                >
                  {priority.count}
                </Chip>
                <div className="text-sm text-gray-600 mt-2">
                  {getPriorityLabel(priority.priority)}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Automation Coverage */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target size={20} />
            <h3 className="text-lg font-semibold">Automation Coverage</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Automated Test Cases</span>
              <span className="text-2xl font-bold text-green-600">
                {metrics.testCases.automated}
              </span>
            </div>
            <Progress
              value={parseFloat(metrics.testCases.automationCoverage)}
              color="success"
              className="max-w-full"
            />
            <p className="text-sm text-gray-600">
              {metrics.testCases.automationCoverage} of test cases have automation
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Test Runs Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-gray-600 mb-2">Total Test Runs</p>
            <p className="text-3xl font-bold">{metrics.testRuns.total}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-gray-600 mb-2">Active Runs</p>
            <p className="text-3xl font-bold text-blue-600">{metrics.testRuns.active}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-gray-600 mb-2">Completed Runs</p>
            <p className="text-3xl font-bold text-green-600">{metrics.testRuns.completed}</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
