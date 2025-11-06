'use client';
import { Button } from '@heroui/react';
import { Plus } from 'lucide-react';
import CaseStepsEditor from '../CaseStepsEditor';
import { CaseType, StepType } from '@/types/case';

type Props = {
  testCase: CaseType;
  setTestCase: (tc: CaseType) => void;
};

export default function StepsForm({ testCase, setTestCase }: Props) {
  const onStepUpdate = (stepId: number, changeStep: StepType) => {
    setTestCase({
      ...testCase,
      Steps: testCase.Steps?.map((s) => (s.id === stepId ? changeStep : s)) || []
    });
  };

  return (
    <div>
      <Button
        startContent={<Plus size={16} />}
        size="sm"
        onPress={() => {
          const newStep: StepType = {
            id: Date.now(),
            step: '',
            result: '',
            createdAt: new Date(),
            updatedAt: new Date(),
            caseSteps: { stepNo: (testCase.Steps?.length || 0) + 1 },
            uid: `uid${Date.now()}`,
            editState: 'new'
          };
          setTestCase({ ...testCase, Steps: [...(testCase.Steps || []), newStep] });
        }}
      >
        Add Step
      </Button>

      {testCase.Steps && (
        <CaseStepsEditor
        isDisabled={false}
          steps={testCase.Steps}
          onStepUpdate={onStepUpdate}
          onStepPlus={() => {}}
          onStepDelete={(id) => setTestCase({ ...testCase, Steps: testCase.Steps?.filter((s) => s.id !== id) })}
          messages={{ steps: 'Steps' } as any}
        />
      )}
    </div>
  );
}
