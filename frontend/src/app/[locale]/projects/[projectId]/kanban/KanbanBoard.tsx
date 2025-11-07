'use client';

import { useState, useEffect, useContext } from 'react';
import { Card, CardBody, CardHeader, Chip, Spinner } from '@heroui/react';
import { GripVertical, User as UserIcon, Clock } from 'lucide-react';
import Config from '@/config/config';
import { TokenContext } from '@/utils/TokenProvider';

const apiServer = Config.apiServer;

type TestCase = {
  id: number;
  title: string;
  priority: number;
  assignedTo?: number;
  assignee?: {
    id: number;
    username: string;
    email: string;
  };
  Folder?: {
    id: number;
    name: string;
  };
  estimatedHours?: number;
  workflowStatus: string;
};

type KanbanColumn = {
  id: string;
  title: string;
  cases: TestCase[];
  color: string;
};

type Props = {
  projectId: string;
};

export function KanbanBoard({ projectId }: Props) {
  const context = useContext(TokenContext);
  const [columns, setColumns] = useState<KanbanColumn[]>([
    { id: 'draft', title: 'Draft', cases: [], color: 'bg-gray-100' },
    { id: 'ready', title: 'Ready', cases: [], color: 'bg-blue-100' },
    { id: 'in-progress', title: 'In Progress', cases: [], color: 'bg-yellow-100' },
    { id: 'review', title: 'Review', cases: [], color: 'bg-purple-100' },
    { id: 'completed', title: 'Completed', cases: [], color: 'bg-green-100' },
  ]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<TestCase | null>(null);

  useEffect(() => {
    fetchKanbanData();
  }, [projectId]);

  async function fetchKanbanData() {
    if (!context.isSignedIn()) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${apiServer}/api/kanban?projectId=${projectId}`, {
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
      
      // Update columns with fetched data
      setColumns(prev => prev.map(col => ({
        ...col,
        cases: data.columns[col.id] || [],
      })));
    } catch (error) {
      console.error('Error fetching kanban data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateCaseStatus(caseId: number, newStatus: string) {
    if (!context.isSignedIn()) {
      return;
    }

    try {
      const response = await fetch(`${apiServer}/api/kanban/${caseId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${context.token.access_token}`,
        },
        body: JSON.stringify({ workflowStatus: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Refresh data after update
      await fetchKanbanData();
    } catch (error) {
      console.error('Error updating case status:', error);
    }
  }

  const handleDragStart = (e: React.DragEvent, testCase: TestCase) => {
    setDraggedItem(testCase);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    
    if (!draggedItem) return;

    // Update the status
    await updateCaseStatus(draggedItem.id, targetColumnId);
    setDraggedItem(null);
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'danger';
      case 2: return 'warning';
      case 3: return 'primary';
      case 4: return 'default';
      default: return 'default';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Critical';
      case 2: return 'High';
      case 3: return 'Medium';
      case 4: return 'Low';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div
            key={column.id}
            className="flex-shrink-0 w-80"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <Card className={`${column.color} border-2 min-h-[600px]`}>
              <CardHeader className="flex justify-between items-center pb-2">
                <h3 className="text-lg font-semibold">{column.title}</h3>
                <Chip size="sm" variant="flat">
                  {column.cases.length}
                </Chip>
              </CardHeader>
              <CardBody className="gap-2 overflow-y-auto max-h-[calc(100vh-250px)]">
                {column.cases.map((testCase) => (
                  <Card
                    key={testCase.id}
                    className="cursor-move hover:shadow-lg transition-shadow bg-white"
                    draggable
                    onDragStart={(e) => handleDragStart(e, testCase)}
                  >
                    <CardBody className="p-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="text-gray-400 mt-1 flex-shrink-0" size={16} />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-sm line-clamp-2">
                              {testCase.title}
                            </h4>
                            <Chip
                              size="sm"
                              color={getPriorityColor(testCase.priority)}
                              variant="flat"
                              className="ml-2"
                            >
                              {getPriorityLabel(testCase.priority)}
                            </Chip>
                          </div>
                          
                          {testCase.Folder && (
                            <p className="text-xs text-gray-500 mb-2">
                              {testCase.Folder.name}
                            </p>
                          )}
                          
                          <div className="flex justify-between items-center">
                            {testCase.assignee ? (
                              <div className="flex items-center gap-1">
                                <UserIcon size={14} className="text-gray-400" />
                                <span className="text-xs text-gray-600">
                                  {testCase.assignee.username}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Unassigned</span>
                            )}
                            
                            {testCase.estimatedHours && (
                              <div className="flex items-center gap-1">
                                <Clock size={14} className="text-gray-400" />
                                <span className="text-xs text-gray-600">
                                  {testCase.estimatedHours}h
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
                {column.cases.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    No test cases
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
