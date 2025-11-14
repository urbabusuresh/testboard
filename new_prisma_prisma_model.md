
analyse the prisma file if already have mapping for the exisitng prismaa file do according chnages: here we have covered the reference document mapping for every module,testcase,scenarios and also module level access roles, and have ftured andlyse the prism well .


generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

/*
 Consolidated schema: Projects, Modules, hierarchical artifacts, requirements,
 reference docs, automation mapping & runs, flows, executions, step results,
 defects, module access and audit log
*/

enum ProjectRole {
  OWNER
  MANAGER
  LEAD
  LEAD_APPROVER
  REVIEWER
  TEST_MANAGER
  DEVELOPER
  TESTER
  AUDITOR
  GUEST
}

enum ModulePermission {
  VIEW
  EXECUTE
  EDIT
  COMMENT
  APPROVE
  ADMIN
}

model User {
  id            Int      @id @default(autoincrement())
  login         String   @unique
  name          String?
  email         String   @unique
  globalRoles   Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  projectMemberships ProjectMember[]
  createdProjects    Project[] @relation("ProjectCreator")
}

model Project {
  id               Int       @id @default(autoincrement())
  key              String    @unique
  name             String
  description      String?
  methodology      String?
  createdBy        Int
  createdAt        DateTime  @default(now())

  startDate        DateTime?
  endDate          DateTime?
  bugTrackingTools Json?

  creator          User      @relation("ProjectCreator", fields:[createdBy], references:[id])
  members          ProjectMember[]
  modules          Module[]
  milestones       Milestone[]
}

model ProjectMember {
  id        Int        @id @default(autoincrement())
  projectId Int
  userId    Int
  role      ProjectRole
  isActive  Boolean    @default(true)
  joinedAt  DateTime   @default(now())

  project   Project    @relation(fields:[projectId], references:[id])
  user      User       @relation(fields:[userId], references:[id])

  @@unique([projectId, userId])
}

model Module {
  id                   Int       @id @default(autoincrement())
  projectId            Int
  name                 String
  key                  String?
  type                 String?
  description          String?
  createdAt            DateTime  @default(now())
  primaryRequirementId Int?

  project              Project   @relation(fields:[projectId], references:[id])
  submodules           SubModule[]
  releases             Release[]
  referenceLinks       ReferenceDocumentLink[]
  moduleAccess         ModuleAccess[]
}

model ModuleAccess {
  id               Int      @id @default(autoincrement())
  projectMemberId  Int
  moduleId         Int
  permissions      Json
  metadata         Json?
  createdBy        Int?
  createdAt        DateTime @default(now())

  projectMember    ProjectMember @relation(fields:[projectMemberId], references:[id])
  module           Module        @relation(fields:[moduleId], references:[id])

  @@unique([projectMemberId, moduleId])
  @@index([moduleId])
  @@index([projectMemberId])
}

model SubModule {
  id          Int       @id @default(autoincrement())
  moduleId    Int
  name        String
  key         String?
  description String?
  createdAt   DateTime  @default(now())

  module      Module    @relation(fields:[moduleId], references:[id])
  features    Feature[]
}

model Feature {
  id           Int       @id @default(autoincrement())
  subModuleId  Int
  name         String
  key          String?
  description  String?
  createdAt    DateTime  @default(now())

  subModule    SubModule @relation(fields:[subModuleId], references:[id])
  useCases     UseCase[]
}

model UseCase {
  id          Int       @id @default(autoincrement())
  featureId   Int
  title       String
  description String?
  version     Int       @default(1)
  createdAt   DateTime  @default(now())

  feature     Feature   @relation(fields:[featureId], references:[id])
  scenarios   Scenario[]
}

model Scenario {
  id          Int       @id @default(autoincrement())
  useCaseId   Int
  title       String
  description String?
  version     Int       @default(1)
  createdAt   DateTime  @default(now())

  useCase     UseCase   @relation(fields:[useCaseId], references:[id])
  scenarioTestCases ScenarioTestCase[]
}

model ScenarioTestCase {
  id          Int      @id @default(autoincrement())
  scenarioId  Int
  testCaseId  Int
  orderIndex  Int      @default(0)
  pinned      Boolean  @default(false)

  scenario    Scenario @relation(fields:[scenarioId], references:[id])
  testCase    TestCase @relation(fields:[testCaseId], references:[id])

  @@unique([scenarioId, testCaseId])
}

model TestCase {
  id             Int               @id @default(autoincrement())
  title          String
  description    String?
  priority       String?
  severity       String?
  createdBy      Int
  assignedTo     Int?
  currentVersion Int               @default(1)
  createdAt      DateTime          @default(now())

  creator        User               @relation(fields:[createdBy], references:[id])
  assignee       User?              @relation(fields:[assignedTo], references:[id])
  versions       TestCaseVersion[]
  scenarioLinks  ScenarioTestCase[]
  referenceLinks ReferenceDocumentLink[]
  primaryRequirementId Int?
}

model TestCaseVersion {
  id                Int       @id @default(autoincrement())
  testCaseId        Int
  version           Int
  status            String    @default("active")
  releaseId         Int?
  previousVersionId Int?
  changeNote        String?
  createdBy         Int
  createdAt         DateTime @default(now())

  testCase          TestCase  @relation(fields:[testCaseId], references:[id])
  release           Release?  @relation(fields:[releaseId], references:[id])
  previousVersion   TestCaseVersion? @relation("PreviousVersion", fields:[previousVersionId], references:[id])
  nextVersions      TestCaseVersion[] @relation("PreviousVersion")
  steps             TestCaseStep[]
  automationBindings AutomationMapping[]
  referenceLinks     ReferenceDocumentLink[]
}

model TestCaseStep {
  id               Int      @id @default(autoincrement())
  testCaseVersionId Int
  stepNo           Int
  action           String
  expected         String
  createdAt        DateTime @default(now())

  testCaseVersion  TestCaseVersion @relation(fields:[testCaseVersionId], references:[id])
  stepResults      ExecutionStepResult[]
}

model ReferenceDocument {
  id          Int      @id @default(autoincrement())
  title       String
  url         String?
  contentHash String?
  docType     String?
  createdBy   Int?
  createdAt   DateTime @default(now())

  links       ReferenceDocumentLink[]
}

model ReferenceDocumentLink {
  id                  Int              @id @default(autoincrement())
  referenceDocumentId Int
  targetType          String
  targetId            Int
  addedBy             Int?
  addedAt             DateTime @default(now())

  referenceDocument   ReferenceDocument @relation(fields:[referenceDocumentId], references:[id])

  @@index([targetType, targetId])
}

model Requirement {
  id           Int       @id @default(autoincrement())
  key          String?   @unique
  title        String
  description  String?
  version      Int       @default(1)
  status       String    @default("draft")
  createdBy    Int
  createdAt    DateTime  @default(now())

  requirementLinks RequirementLink[]
}

model RequirementLink {
  id             Int       @id @default(autoincrement())
  requirementId  Int
  targetType     String
  targetId       Int
  createdBy      Int?
  createdAt      DateTime  @default(now())

  requirement    Requirement @relation(fields:[requirementId], references:[id])

  @@index([targetType, targetId])
}

model Release {
  id         Int      @id @default(autoincrement())
  moduleId   Int
  version    String
  startDate  DateTime?
  endDate    DateTime?
  createdAt  DateTime @default(now())
  module     Module   @relation(fields:[moduleId], references:[id])
}

model TestCycle {
  id         Int      @id @default(autoincrement())
  projectId  Int?
  moduleId   Int?
  environment String?
  startDate  DateTime?
  endDate    DateTime?
  createdBy  Int
  createdAt  DateTime @default(now())
  executions ExecutionRun[]

  project    Project? @relation(fields:[projectId], references:[id])
}

model ExecutionRun {
  id               Int      @id @default(autoincrement())
  testCaseVersionId Int
  cycleId          Int?
  executedBy       Int?
  executedOn       DateTime @default(now())
  result           String
  evidence         Json?
  logsUrl          String?
  source           String?
  createdAt       DateTime @default(now())

  releaseNotes     String?
  metadata         Json?
  automationRunId  Int?
  executionRunSummary String?

  testCaseVersion  TestCaseVersion @relation(fields:[testCaseVersionId], references:[id])
  cycle            TestCycle? @relation(fields:[cycleId], references:[id])
  stepResults      ExecutionStepResult[] @relation("RunStepResults")
  comments         ExecutionRunComment[]
  approvals        ExecutionRunApproval[]
  defects          Defect[]   @relation("ExecutionDefects")
}

model ExecutionStepResult {
  id                 Int      @id @default(autoincrement())
  executionRunId     Int
  testCaseStepId     Int
  stepNo             Int
  expectedSnapshot   String?
  actualResult       String?
  testData           Json?
  evidence           Json?
  status             String
  startedAt          DateTime?
  endedAt            DateTime?
  reviewerId         Int?
  reviewedAt         DateTime?
  reviewComment      String?
  approverId         Int?
  approvedAt         DateTime?
  approvalComment    String?

  executionRun       ExecutionRun @relation("RunStepResults", fields:[executionRunId], references:[id])
  testCaseStep       TestCaseStep @relation(fields:[testCaseStepId], references:[id])
}

model ExecutionRunComment {
  id            Int      @id @default(autoincrement())
  executionRunId Int
  authorId      Int
  comment       String
  createdAt     DateTime @default(now())

  executionRun  ExecutionRun @relation(fields:[executionRunId], references:[id])
}

model ExecutionRunApproval {
  id            Int      @id @default(autoincrement())
  executionRunId Int
  approverId    Int
  status        String
  comment       String?
  actedAt       DateTime @default(now())

  executionRun  ExecutionRun @relation(fields:[executionRunId], references:[id])
}

model Defect {
  id                Int      @id @default(autoincrement())
  title             String
  description       String?
  severity          String?
  priority          String?
  state             String   @default("open")
  assignedTo        Int?
  reporterId        Int?
  linkedExecutionId Int?
  externalRefs      Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model ArtifactLink {
  id        Int      @id @default(autoincrement())
  fromType  String
  fromId    Int
  toType    String
  toId      Int
  relation  String
  createdBy Int
  createdAt DateTime @default(now())
}

model AutomationCase {
  id              Int      @id @default(autoincrement())
  suiteId         Int?
  externalId      String?
  title           String
  commandTemplate String
  workingDir      String?
  runtimeEnv      Json?
  language        String?
  defaultRunner   String?
  createdBy       Int
  createdAt       DateTime @default(now())
}
// Add/merge these models into prisma/schema.prisma
model AutomationMapping {      // convenience: single-table mapping of testcaseVersion <-> automation case + metadata
  id                 Int      @id @default(autoincrement())
  automationCaseId   Int
  testCaseVersionId  Int
  // static metadata about the automation artifact
  codeFilename       String?   // file name of test script (e.g. spec.js or test_login.py)
  repoPath           String?   // repo/path or full git url + path to file
  server             String?   // execution host or agent identifier (agent name or URL)
  runnerImage        String?   // docker image / runner identifier
  defaultCommand     String?   // default run command template for this mapping
  defaultArgs        Json?     // default args (e.g. { "env":"stg","browser":"chrome" })
  createdBy          Int?
  createdAt          DateTime  @default(now())

  automationCase     AutomationCase   @relation(fields:[automationCaseId], references:[id])
  testCaseVersion    TestCaseVersion  @relation(fields:[testCaseVersionId], references:[id])

  @@unique([automationCaseId, testCaseVersionId])
  @@index([testCaseVersionId])
  @@index([automationCaseId])
}

model AutomationRun {         // actual run (manual/CI/agent) for an AutomationMapping or AutomationCase
  id                  Int      @id @default(autoincrement())
  mappingId           Int?     // optional, created from a mapping
  automationCaseId    Int?     // fallback if no mapping used
  testCaseVersionId   Int?     // optional copy for quick joins (redundant with mapping)
  releaseId           Int?     // link to Release when run is part of a release-level job
  scheduledJobId      Int?     // if run was created by scheduler
  triggeredByUserId   Int?     // who triggered (user) - null if CI
  triggeredByCI       Boolean  @default(false)
  triggerSource       String?  // "manual" | "ci-webhook" | "scheduler" | "flow"
  runCommand          String?  // actual command run (templated with resolved args)
  runArgs             Json?
  serverAgent         String?  // actual agent/server that executed the run
  logsUrl             String?
  artifacts           Json?    // array of artifact URLs
  exitCode            Int?
  status              String   @default("QUEUED") // QUEUED,RUNNING,SUCCESS,FAILED,ABORTED
  startedAt           DateTime?
  endedAt             DateTime?
  resultSummary       String?
  createdAt           DateTime @default(now())

  mapping             AutomationMapping? @relation(fields:[mappingId], references:[id])
  automationCase      AutomationCase?    @relation(fields:[automationCaseId], references:[id])
  testCaseVersion     TestCaseVersion?   @relation(fields:[testCaseVersionId], references:[id])
  release             Release?           @relation(fields:[releaseId], references:[id])

  // link to ExecutionRun(s) created from this automation run
  executionRuns       ExecutionRun[]      @relation("AutomationExecutionRuns")
  @@index([releaseId])
  @@index([testCaseVersionId])
  @@index([mappingId])
}

model SchedulerJob {         // scheduler entries that create AutomationRun on schedule
  id                 Int      @id @default(autoincrement())
  name               String
  projectId          Int?
  mappingId          Int?
  automationCaseId   Int?
  cronExpression     String?   // CRON or cron-like schedule
  timeZone           String?   // optional timezone
  enabled            Boolean   @default(true)
  lastTriggeredAt    DateTime?
  nextRunAt          DateTime?
  concurrencyPolicy  String?   // e.g. "queue","skip","parallel"
  createdBy          Int?
  createdAt          DateTime  @default(now())

  mapping            AutomationMapping? @relation(fields:[mappingId], references:[id])
  automationCase     AutomationCase?    @relation(fields:[automationCaseId], references:[id])

  @@index([projectId])
}

model ReleaseRun {           // grouping object to represent "a release-level run/batch"
  id                 Int      @id @default(autoincrement())
  releaseId          Int
  name               String?  // e.g. "R13 Nightly Run 2025-11-14"
  scheduledAt        DateTime?
  startedAt          DateTime?
  endedAt            DateTime?
  createdBy          Int?
  notes              String?
  status             String   @default("SCHEDULED") // SCHEDULED,RUNNING,COMPLETED,FAILED
  createdAt          DateTime @default(now())

  release            Release   @relation(fields:[releaseId], references:[id])
  automationRuns     AutomationRun[] @relation()
  @@index([releaseId])
}
model AutomationMapping {
  id                 Int      @id @default(autoincrement())
  automationCaseId
