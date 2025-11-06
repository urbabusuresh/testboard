'use client';
import CaseAttachmentsEditor from '../CaseAttachmentsEditor';
import { CaseType } from '@/types/testcaseModel';

type Props = {
  testCase: CaseType;
  setTestCase: (tc: CaseType) => void;
};

export default function AttachmentsForm({ testCase, setTestCase }: Props) {
  return (
    <CaseAttachmentsEditor
     isDisabled={false}
      attachments={testCase.Attachments || []}
      onAttachmentDownload={() => {}}
      onAttachmentDelete={(id) => setTestCase({ ...testCase, Attachments: testCase.Attachments?.filter((a) => a.id !== id) })}
      onFilesDrop={() => {}}
      onFilesInput={() => {}}
      messages={{ attachments: 'Attachments' } as any}
    />
  );
}
