 type CaseType = {
  id: number;
  title: string;
  state: number;
  priority: number;
  type: number;
  automationStatus: number;
  description: string;
  template: number;
  preConditions: string;
  expectedResults: string;
  folderId: number;
  caseType: number; // test intent (positive/negative/etc.)
  Steps?: StepType[];
  RunCases?: RunCaseType[];
  Attachments?: AttachmentType[];
  isIncluded: boolean;
  runStatus: number;

  // ✅ Automation
  automationIds: string[];

  // ✅ Requirement mapping
  requirementId: string;

  // ✅ Module / Feature
  moduleName?: string;


};


type CaseStepType = {
  createdAt?: Date;
  updatedAt?: Date;
  CaseId?: number;
  StepId?: number;
  stepNo: number;
};

type StepType = {
  id: number;
  step: string;
  result: string;
  createdAt: Date;
  updatedAt: Date;
  caseSteps: CaseStepType;
  uid: string;
  editState: 'notChanged' | 'changed' | 'new' | 'deleted';
};

type RunCaseType = {
  id: number;
  runId: number;
  caseId: number;
  status: number;
  editState: 'notChanged' | 'changed' | 'new' | 'deleted';
};

type CaseAttachmentType = {
  createdAt: Date;
  updatedAt: Date;
  caseId: number;
  attachmentId: number;
};

type AttachmentType = {
  id: number;
  title: string;
  detail: string;
  filename: string;
  createdAt: Date;
  updatedAt: Date;
  caseAttachments: CaseAttachmentType;
};

type CasesMessages = {
  testCaseList: string;
  id: string;
  title: string;
  priority: string;
  actions: string;
  deleteCase: string;
  close: string;
  areYouSure: string;
  delete: string;
  newTestCase: string;
  export: string;
  status: string;
  noCasesFound: string;
  caseTitle: string;
  caseDescription: string;
  create: string;
  pleaseEnter: string;
};

type CaseMessages = {
  automationStatus: string;
  backToCases: string;
  updating: string;
  update: string;
  updatedTestCase: string;
  basic: string;
  title: string;
  pleaseEnterTitle: string;
  description: string;
  testCaseDescription: string;
  priority: string;
  type: string;
  testcaseResultType: string;
  template: string;
  testDetail: string;
  preconditions: string;
  expectedResult: string;
  step: string;
  text: string;
  steps: string;
  newStep: string;
  detailsOfTheStep: string;
  deleteThisStep: string;
  insertStep: string;
  attachments: string;
  delete: string;
  download: string;
  deleteFile: string;
  clickToUpload: string;
  orDragAndDrop: string;
  maxFileSize: string;
  areYouSureLeave: string;
};


type TestCaseExecutions =
{ 
  run_id:number;
testcase_id:number;
cycle_number:number;
cycle_type:string;
status:string;
include_in_run:boolean;
test_data:string;
preparation_start:Date;
preparation_end:Date;
prepared_by:string;
executed_by:string;
executed_at:Date;
requirement_ids:string;
bug_ids:string[];
attachment_ids:string[];
remarks:string;
reviewed_by:string;
review_date:Date;
reviewer_comments:string;
approved_by:string;
approved_date:Date;
approver_comments:string
environment:Environment

}

type Environment={
os:string;
browser:string;
env:string;
database:string;
}
export type { CaseType, StepType, AttachmentType, CasesMessages, CaseMessages };
