'use client';
import { Input } from '@heroui/react';
import { CaseType } from '@/types/case';

type Props = {
  testCase: CaseType;
  setTestCase: (tc: CaseType) => void;
};

export default function EnvironmentForm({ testCase, setTestCase }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Input
        size="sm"
        variant="bordered"
        label="OS"
        value={testCase.environment?.os ?? ''}
        onChange={(e) => setTestCase({ ...testCase, environment: { ...testCase.environment, os: e.target.value } })}
      />
      <Input
        size="sm"
        variant="bordered"
        label="Browser"
        value={testCase.environment?.browser ?? ''}
        onChange={(e) => setTestCase({ ...testCase, environment: { ...testCase.environment, browser: e.target.value } })}
      />
      <Input
        size="sm"
        variant="bordered"
        label="Database"
        value={testCase.environment?.db ?? ''}
        onChange={(e) => setTestCase({ ...testCase, environment: { ...testCase.environment, db: e.target.value } })}
      />
      <Input
        size="sm"
        variant="bordered"
        label="Device"
        value={testCase.environment?.device ?? ''}
        onChange={(e) => setTestCase({ ...testCase, environment: { ...testCase.environment, device: e.target.value } })}
      />
    </div>
  );
}
