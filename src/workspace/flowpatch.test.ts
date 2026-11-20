import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTaskRecord,
  applyAddTask,
  applyToggleTask,
  applyDeleteTask,
} from './taskReducer';
import {
  HEALTHY_TASK_REDUCER_SOURCE,
  REGRESSION_TASK_REDUCER_SOURCE,
  INITIAL_SEED_TASKS,
} from './patchTemplates';
import { parseTestMdFlow, parseKaneNdjsonStream } from './flowParser';
import { detectCodePatchState, buildAgentRepairPlan } from './repairEngine';
import type { KaneVerificationRun } from '../types/flowpatch';

test('taskReducer: createTaskRecord validates non-empty title and initializes task fields', () => {
  assert.throws(() => createTaskRecord({ title: '   ' }), /Task title is required/);
  const task = createTaskRecord(
    { title: 'Verify Kane CLI flow', category: 'QA', priority: 'high' },
    '2026-11-18T18:30:00.000Z'
  );
  assert.equal(task.title, 'Verify Kane CLI flow');
  assert.equal(task.category, 'QA');
  assert.equal(task.priority, 'high');
  assert.equal(task.completed, false);
});

test('taskReducer: applyAddTask, applyToggleTask, and applyDeleteTask update task board deterministically', () => {
  const newTask = createTaskRecord({ title: 'New verification item' });
  const afterAdd = applyAddTask(INITIAL_SEED_TASKS, newTask);
  assert.equal(afterAdd.length, INITIAL_SEED_TASKS.length + 1);
  assert.equal(afterAdd[0].id, newTask.id);

  const afterToggle = applyToggleTask(afterAdd, newTask.id);
  assert.equal(afterToggle[0].completed, true);

  const afterDelete = applyDeleteTask(afterToggle, newTask.id);
  assert.equal(afterDelete.length, INITIAL_SEED_TASKS.length);
  assert.equal(afterDelete.some((t) => t.id === newTask.id), false);
});

test('flowParser: parseTestMdFlow parses frontmatter, title, and H2 steps from *_test.md', () => {
  const sampleMd = `---
mode: testing
url: http://localhost:3000
headless: true
max_steps: 25
tags: [regression, task-board]
---

# FlowPatch Task Board Primary User Journey

## Verify Task Board Workspace Loads
Navigate to http://localhost:3000 and verify workspace loads.

## Create a New Task Item
Type "Verify Kane flow regression check" and click "Add Task".
`;
  const parsed = parseTestMdFlow(sampleMd, 'flows/task_board_flow_test.md');
  assert.equal(parsed.title, 'FlowPatch Task Board Primary User Journey');
  assert.equal(parsed.frontmatter.mode, 'testing');
  assert.equal(parsed.frontmatter.url, 'http://localhost:3000');
  assert.equal(parsed.frontmatter.headless, true);
  assert.equal(parsed.frontmatter.max_steps, 25);
  assert.deepEqual(parsed.frontmatter.tags, ['regression', 'task-board']);
  assert.equal(parsed.steps.length, 2);
  assert.equal(parsed.steps[0].heading, 'Verify Task Board Workspace Loads');
  assert.equal(parsed.steps[1].heading, 'Create a New Task Item');
});

test('flowParser: parseKaneNdjsonStream parses passing and failing Kane CLI stream events', () => {
  const steps = [
    { index: 1, heading: 'Verify Task Board Workspace Loads', objective: 'Open app' },
    { index: 2, heading: 'Create a New Task Item', objective: 'Add task' },
    { index: 3, heading: 'Complete the Created Task', objective: 'Toggle task' },
  ];

  const failingStream = [
    JSON.stringify({ type: 'stream_start', cli_version: '0.10.6', surface: 'testmd', v: 1 }),
    JSON.stringify({ type: 'test_md_step_start', step_index: 1, heading: 'Verify Task Board Workspace Loads' }),
    JSON.stringify({ type: 'test_md_step_end', step_index: 1, status: 'passed', duration_s: 0.42, remark: 'Workspace visible' }),
    JSON.stringify({ type: 'test_md_step_start', step_index: 2, heading: 'Create a New Task Item' }),
    JSON.stringify({
      type: 'test_md_step_end',
      step_index: 2,
      status: 'failed',
      duration_s: 0.65,
      remark: 'Task not added after clicking Add Task',
      failure_reason: 'Expected "Verify Kane flow regression check" in [data-testid="task-list"], found 0 matches',
    }),
    JSON.stringify({ type: 'test_md_done', overall_status: 'failed', duration_s: 1.07 }),
  ];

  const parsedFail = parseKaneNdjsonStream(failingStream, steps);
  assert.equal(parsedFail.overallStatus, 'failed');
  assert.equal(parsedFail.failedStepIndex, 2);
  assert.equal(parsedFail.steps[0].status, 'passed');
  assert.equal(parsedFail.steps[1].status, 'failed');
  assert.equal(parsedFail.steps[2].status, 'skipped');
  assert.match(parsedFail.failureSummary ?? '', /Expected "Verify Kane flow regression check"/);
});

test('repairEngine: detectCodePatchState and buildAgentRepairPlan repair broken reducer using Kane failure record', () => {
  assert.equal(detectCodePatchState(HEALTHY_TASK_REDUCER_SOURCE, false), 'healthy');
  assert.equal(detectCodePatchState(REGRESSION_TASK_REDUCER_SOURCE, false), 'regression_injected');
  assert.equal(detectCodePatchState(HEALTHY_TASK_REDUCER_SOURCE, true), 'repaired');

  const mockFailedRun: KaneVerificationRun = {
    runNumber: 2,
    runId: 'kane-run-2',
    timestamp: '2026-11-18T18:35:00.000Z',
    flowFile: 'flows/task_board_flow_test.md',
    targetUrl: 'http://localhost:3000',
    overallStatus: 'failed',
    durationMs: 1120,
    codeStateAtRun: 'regression_injected',
    failedStepIndex: 2,
    failureSummary: 'Task "Verify Kane flow regression check" did not appear in task list after clicking Add Task.',
    steps: [
      {
        stepIndex: 1,
        heading: 'Verify Task Board Workspace Loads',
        objective: 'Load workspace',
        status: 'passed',
        durationMs: 380,
        remark: 'Loaded Sprint Task Board',
      },
      {
        stepIndex: 2,
        heading: 'Create a New Task Item',
        objective: 'Add task',
        status: 'failed',
        durationMs: 740,
        remark: 'Task missing after Add Task click',
        failureReason: 'Task "Verify Kane flow regression check" did not appear in task list after clicking Add Task.',
      },
    ],
    cliDiagnostics: {
      installed: true,
      binaryPath: '/usr/local/bin/kane-cli',
      version: '0.10.6',
      authStatus: 'not_configured',
      commandExecuted: 'kane-cli testmd run flows/task_board_flow_test.md --headless --agent --url http://localhost:3000',
      exitCode: 1,
      rawStdout: '',
      rawStderr: '',
      executionEngine: 'kane-cli-with-local-chromium-browser',
    },
    ndjsonStream: [],
    savedArtifactPath: 'data/latest-kane-run.json',
  };

  const { repairedSource, record } = buildAgentRepairPlan(REGRESSION_TASK_REDUCER_SOURCE, mockFailedRun);
  assert.equal(detectCodePatchState(repairedSource, true), 'repaired');
  assert.equal(record.triggeredByRunNumber, 2);
  assert.equal(record.agentType, 'local_deterministic_agent');
  assert.match(record.agentLabel, /Local Demo Agent/);
  assert.match(record.diagnosis, /Kane Verification Run #2/);
  assert.match(record.failedStepHeading, /Step 2: Create a New Task Item/);
});
