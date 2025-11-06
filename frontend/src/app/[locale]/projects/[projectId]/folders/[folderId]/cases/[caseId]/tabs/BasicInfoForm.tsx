'use client';
import { Input, Textarea, Select, SelectItem } from '@heroui/react';
import { priorities, testTypes, automationStatus, testCaseIntent, templates } from '@/config/selection';
import { CaseType } from '@/types/case';
import { PriorityMessages } from '@/types/priority';
import { TestTypeMessages } from '@/types/testType';

type Props = {
  testCase: CaseType;
  setTestCase: (tc: CaseType) => void;
};

export default function BasicInfoForm({ testCase, setTestCase }: Props) {
  return (
    <div>
      <Input
        size="sm"
        variant="bordered"
        label="Title"
        value={testCase.title}
        onChange={(e) => setTestCase({ ...testCase, title: e.target.value })}
        className="mt-3"
      />
      <Textarea
        size="sm"
        variant="bordered"
        label="Description"
        value={testCase.description}
        onValueChange={(val) => setTestCase({ ...testCase, description: val })}
        className="mt-3"
      />
      <Input
        size="sm"
        variant="bordered"
        label="Module / Feature"
        value={testCase.moduleName}
        onChange={(e) => setTestCase({ ...testCase, moduleName: e.target.value })}
        className="mt-3"
      />
      <Input
        size="sm"
        variant="bordered"
        label="Requirement ID"
        value={testCase.requirementId}
        onChange={(e) => setTestCase({ ...testCase, requirementId: e.target.value })}
        className="mt-3"
      />
      {/* <Textarea
        size="sm"
        variant="bordered"
        label="Test Data"
        value={testCase.testData}
        onValueChange={(val) => setTestCase({ ...testCase, testData: val })}
        className="mt-3"
      /> */}
      <Textarea
        size="sm"
        variant="bordered"
        label="Preconditions"
        value={testCase.preConditions}
        onValueChange={(val) => setTestCase({ ...testCase, preConditions: val })}
        className="mt-3"
      />
      <Textarea
        size="sm"
        variant="bordered"
        label="Expected Results"
        value={testCase.expectedResults}
        onValueChange={(val) => setTestCase({ ...testCase, expectedResults: val })}
        className="mt-3"
      />
    </div>
  );
}
