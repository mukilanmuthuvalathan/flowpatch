export type TaskPriority = 'high' | 'medium' | 'low';

export interface TaskItem {
  id: string;
  title: string;
  category: string;
  priority: TaskPriority;
  completed: boolean;
  createdAt: string;
}

export type CodePatchState = 'healthy' | 'regression_injected' | 'repaired';

export interface KaneFlowStep {
  index: number;
  heading: string;
  objective: string;
}

export interface ParsedTestMdFlow {
  filePath: string;
  title: string;
  frontmatter: {
    mode: string;
    url: string;
    headless: boolean;
    max_steps: number;
    tags: string[];
  };
  steps: KaneFlowStep[];
  rawMarkdown: string;
}

export type StepStatus = 'passed' | 'failed' | 'skipped' | 'running';

export interface KaneStepResult {
  stepIndex: number;
  heading: string;
  objective: string;
  status: StepStatus;
  durationMs: number;
  remark: string;
  domObservation?: string;
  failureReason?: string;
}

export interface KaneCliDiagnostics {
  installed: boolean;
  binaryPath: string;
  version: string;
  authStatus: 'authenticated' | 'not_configured' | 'unavailable';
  commandExecuted: string;
  exitCode: number;
  rawStdout: string;
  rawStderr: string;
  executionEngine: 'kane-cli-cloud' | 'kane-cli-with-local-chromium-browser';
  authGuidance?: string;
}

export interface KaneVerificationRun {
  runNumber: number;
  runId: string;
  timestamp: string;
  flowFile: string;
  targetUrl: string;
  overallStatus: 'passed' | 'failed';
  durationMs: number;
  codeStateAtRun: CodePatchState;
  failedStepIndex: number | null;
  failureSummary: string | null;
  steps: KaneStepResult[];
  cliDiagnostics: KaneCliDiagnostics;
  ndjsonStream: string[];
  savedArtifactPath: string;
}

export interface RepairRecord {
  repairId: string;
  timestamp: string;
  triggeredByRunNumber: number | null;
  triggeredByRunId: string | null;
  agentLabel: string;
  agentType: 'local_deterministic_agent';
  targetFile: string;
  failedStepHeading: string;
  diagnosis: string;
  explanation: string;
  unifiedDiff: string;
  appliedSuccessfully: boolean;
}

export interface TimelineEvent {
  id: string;
  sequenceNumber: number;
  timestamp: string;
  kind: 'verification_pass' | 'verification_fail' | 'regression_injected' | 'agent_repair' | 'workspace_reset';
  title: string;
  summary: string;
  runNumber?: number;
  failedStep?: string;
  agentLabel?: string;
  codeStateAfter: CodePatchState;
}

export interface WorkspaceSnapshot {
  tasks: TaskItem[];
  codeState: CodePatchState;
  targetFilePath: string;
  currentSourceCode: string;
  activeDiff: string;
  parsedFlow: ParsedTestMdFlow;
  latestRun: KaneVerificationRun | null;
  runHistory: KaneVerificationRun[];
  repairs: RepairRecord[];
  timeline: TimelineEvent[];
  cliInfo: {
    installed: boolean;
    version: string;
    binaryPath: string;
    authStatus: string;
    verifyCommand: string;
    directKaneCommand: string;
  };
}
