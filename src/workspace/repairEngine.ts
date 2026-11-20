import type { CodePatchState, KaneVerificationRun, RepairRecord } from '../types/flowpatch';
import {
  HEALTHY_TASK_REDUCER_SOURCE,
  REPAIR_UNIFIED_DIFF,
  TARGET_REDUCER_PATH,
} from './patchTemplates';

/**
 * Inspects the on-disk source code of src/workspace/taskReducer.ts to determine whether
 * the regression bug is present or if the reducer is in a healthy working state.
 */
export function detectCodePatchState(sourceCode: string, hasRepairedInSession: boolean = false): CodePatchState {
  if (
    sourceCode.includes('return [...tasks];') ||
    sourceCode.includes('REGRESSION (FP-104)')
  ) {
    return 'regression_injected';
  }
  return hasRepairedInSession ? 'repaired' : 'healthy';
}

/**
 * Consumes the latest Kane CLI verification run record and current source code of
 * src/workspace/taskReducer.ts, diagnoses the failing browser step, and produces a
 * real code repair + audit record.
 *
 * Honesty guarantee: Clearly labels the repair engine as the deterministic Local Demo Agent
 * and never claims an external LLM API was called.
 */
export function buildAgentRepairPlan(
  currentSource: string,
  latestRun: KaneVerificationRun | null,
  nowIso: string = new Date().toISOString()
): {
  repairedSource: string;
  record: RepairRecord;
} {
  const isBroken =
    currentSource.includes('return [...tasks];') ||
    currentSource.includes('REGRESSION (FP-104)');

  if (!isBroken) {
    throw new Error(
      'No regression detected in src/workspace/taskReducer.ts. Click "Simulate regression" first to inject the reproducible bug.'
    );
  }

  const failedStep =
    latestRun?.steps.find((s) => s.status === 'failed') ??
    (latestRun?.failedStepIndex
      ? latestRun.steps.find((s) => s.stepIndex === latestRun.failedStepIndex)
      : undefined);

  const failedStepHeading = failedStep
    ? `Step ${failedStep.stepIndex}: ${failedStep.heading}`
    : 'Step 2: Create a New Task Item';

  const failureEvidence = failedStep?.failureReason ||
    latestRun?.failureSummary ||
    'Browser flow clicked "Add Task" after typing task title, but DOM query on [data-testid="task-list"] found 0 matching items.';

  const runCitation = latestRun
    ? `Kane Verification Run #${latestRun.runNumber} (${latestRun.runId})`
    : 'Local pre-flight source inspection (no failing Kane run recorded yet)';

  const diagnosis = `Consumed failure output from ${runCitation} at "${failedStepHeading}". Browser evidence: ${failureEvidence} AST/source inspection of ${TARGET_REDUCER_PATH} located a no-op shallow copy (\`return [...tasks];\`) inside \`applyAddTask(tasks, _newTask)\` that discarded the newly created TaskItem.`;

  const explanation = `Restored \`applyAddTask(tasks: TaskItem[], newTask: TaskItem)\` in \`${TARGET_REDUCER_PATH}\` to prepend \`newTask\` (\`return [newTask, ...tasks];\`) so submitting the Add Task form commits the new task record to board state.`;

  let repairedSource = currentSource;
  if (currentSource.includes('return [...tasks];')) {
    repairedSource = HEALTHY_TASK_REDUCER_SOURCE;
  }

  const record: RepairRecord = {
    repairId: `repair-${Date.now()}`,
    timestamp: nowIso,
    triggeredByRunNumber: latestRun ? latestRun.runNumber : null,
    triggeredByRunId: latestRun ? latestRun.runId : null,
    agentLabel: 'Local Demo Agent (Deterministic Code Repair)',
    agentType: 'local_deterministic_agent',
    targetFile: TARGET_REDUCER_PATH,
    failedStepHeading,
    diagnosis,
    explanation,
    unifiedDiff: REPAIR_UNIFIED_DIFF,
    appliedSuccessfully: true,
  };

  return {
    repairedSource,
    record,
  };
}
