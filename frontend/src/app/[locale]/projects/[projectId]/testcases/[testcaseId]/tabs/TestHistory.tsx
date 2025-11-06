'use client';
import { useEffect, useState } from 'react';
import { Card, CardBody } from '@heroui/react';

type RunHistory = {
  id: number;
  build: string;
  status: string;
  executedBy: string;
  executionStart: string;
  executionEnd: string;
  remarks: string;
};

export default function TestHistory({ caseId }: { caseId: string }) {
  const [history, setHistory] = useState<RunHistory[]>([]);

  useEffect(() => {
    // TODO: replace with API call
    setHistory([
      {
        id: 1,
        build: 'Build 1',
        status: 'Passed',
        executedBy: 'Alice',
        executionStart: '2025-09-01',
        executionEnd: '2025-09-01',
        remarks: 'All good'
      }
    ]);
  }, [caseId]);

  return (
    <div className="space-y-3">
      {history.map((h) => (
        <Card key={h.id}>
          <CardBody>
            <p><b>Build:</b> {h.build}</p>
            <p><b>Status:</b> {h.status}</p>
            <p><b>Executed By:</b> {h.executedBy}</p>
            <p><b>Start:</b> {h.executionStart} → End: {h.executionEnd}</p>
            <p><b>Remarks:</b> {h.remarks}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
