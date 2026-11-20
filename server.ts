import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { transformSync } from 'esbuild';
import { createServer as createViteServer } from 'vite';
import type {
  CodePatchState,
  KaneVerificationRun,
  RepairRecord,
  TaskItem,
  TaskPriority,
  TimelineEvent,
  WorkspaceSnapshot,
} from './src/types/flowpatch';
import { executeKaneVerification, probeKaneCli } from './src/verification/kaneRunner';
import { parseTestMdFlow } from './src/workspace/flowParser';
import {
  HEALTHY_TASK_REDUCER_SOURCE,
  INITIAL_SEED_TASKS,
  REGRESSION_TASK_REDUCER_SOURCE,
  REGRESSION_UNIFIED_DIFF,
  REPAIR_UNIFIED_DIFF,
  TARGET_REDUCER_PATH,
} from './src/workspace/patchTemplates';
import { buildAgentRepairPlan, detectCodePatchState } from './src/workspace/repairEngine';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'workspace-state.json');
const LATEST_RUN_FILE = path.join(DATA_DIR, 'latest-kane-run.json');
const FLOW_FILE = path.resolve(process.cwd(), 'flows/task_board_flow_test.md');
const REDUCER_FILE = path.resolve(process.cwd(), TARGET_REDUCER_PATH);

interface PersistedWorkspaceState {
  tasks: TaskItem[];
  hasRepairedInSession: boolean;
  activeDiff: string;
  runHistory: KaneVerificationRun[];
  repairs: RepairRecord[];
  timeline: TimelineEvent[];
}

function ensureDirectoriesAndFiles(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(REDUCER_FILE)) {
    fs.mkdirSync(path.dirname(REDUCER_FILE), { recursive: true });
    fs.writeFileSync(REDUCER_FILE, HEALTHY_TASK_REDUCER_SOURCE, 'utf8');
  }
}

function createInitialState(): PersistedWorkspaceState {
  return {
    tasks: structuredClone(INITIAL_SEED_TASKS),
    hasRepairedInSession: false,
    activeDiff: '',
    runHistory: [],
    repairs: [],
    timeline: [
      {
        id: `evt-init-${Date.now()}`,
        sequenceNumber: 1,
        timestamp: new Date().toISOString(),
        kind: 'workspace_reset',
        title: 'Workspace initialized in working state',
        summary:
          'Sprint Task Board loaded with healthy applyAddTask reducer in src/workspace/taskReducer.ts.',
        codeStateAfter: 'healthy',
      },
    ],
  };
}

function loadPersistedState(): PersistedWorkspaceState {
  ensureDirectoriesAndFiles();
  if (!fs.existsSync(STATE_FILE)) {
    const initial = createInitialState();
    fs.writeFileSync(STATE_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as PersistedWorkspaceState;
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : structuredClone(INITIAL_SEED_TASKS),
      hasRepairedInSession: Boolean(parsed.hasRepairedInSession),
      activeDiff: typeof parsed.activeDiff === 'string' ? parsed.activeDiff : '',
      runHistory: Array.isArray(parsed.runHistory) ? parsed.runHistory : [],
      repairs: Array.isArray(parsed.repairs) ? parsed.repairs : [],
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
    };
  } catch {
    const initial = createInitialState();
    fs.writeFileSync(STATE_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
}

function savePersistedState(state: PersistedWorkspaceState): void {
  ensureDirectoriesAndFiles();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Reads and compiles the live on-disk src/workspace/taskReducer.ts file via esbuild
 * so real code edits (Simulate regression / Let agent repair) immediately govern
 * task board behavior on the next request.
 */
function loadLiveTaskReducer(): typeof import('./src/workspace/taskReducer') {
  const tsSource = fs.readFileSync(REDUCER_FILE, 'utf8');
  const compiled = transformSync(tsSource, {
    loader: 'ts',
    format: 'cjs',
    target: 'es2022',
  });
  const modExports: Record<string, unknown> = {};
  const mod = { exports: modExports };
  const fn = new Function('exports', 'module', compiled.code);
  fn(modExports, mod);
  return mod.exports as typeof import('./src/workspace/taskReducer');
}

function getCurrentCodeState(hasRepairedInSession: boolean): {
  sourceCode: string;
  codeState: CodePatchState;
} {
  ensureDirectoriesAndFiles();
  const sourceCode = fs.readFileSync(REDUCER_FILE, 'utf8');
  const codeState = detectCodePatchState(sourceCode, hasRepairedInSession);
  return { sourceCode, codeState };
}

let cachedCliProbe: Awaited<ReturnType<typeof probeKaneCli>> | null = null;

async function getCachedKaneCliProbe(forceRefresh: boolean = false) {
  if (!cachedCliProbe || forceRefresh) {
    cachedCliProbe = await probeKaneCli();
  }
  return cachedCliProbe;
}

async function buildWorkspaceSnapshot(
  state: PersistedWorkspaceState,
  refreshCliProbe: boolean = false
): Promise<WorkspaceSnapshot> {
  const { sourceCode, codeState } = getCurrentCodeState(state.hasRepairedInSession);
  const rawFlowMd = fs.existsSync(FLOW_FILE) ? fs.readFileSync(FLOW_FILE, 'utf8') : '';
  const parsedFlow = parseTestMdFlow(rawFlowMd, 'flows/task_board_flow_test.md');
  const cliProbe = await getCachedKaneCliProbe(refreshCliProbe);
  const latestRun =
    state.runHistory.length > 0 ? state.runHistory[state.runHistory.length - 1] : null;

  return {
    tasks: state.tasks,
    codeState,
    targetFilePath: TARGET_REDUCER_PATH,
    currentSourceCode: sourceCode,
    activeDiff: state.activeDiff,
    parsedFlow,
    latestRun,
    runHistory: state.runHistory,
    repairs: state.repairs,
    timeline: state.timeline,
    cliInfo: {
      installed: cliProbe.installed,
      version: cliProbe.version,
      binaryPath: cliProbe.binaryPath,
      authStatus: cliProbe.authStatus,
      verifyCommand: 'npm run verify',
      directKaneCommand:
        'kane-cli testmd run flows/task_board_flow_test.md --headless --agent --url http://localhost:3000',
    },
  };
}

async function startServer() {
  ensureDirectoriesAndFiles();
  const app = express();
  app.use(express.json());

  // GET /api/workspace — returns complete workspace snapshot
  app.get('/api/workspace', async (_req, res) => {
    try {
      const state = loadPersistedState();
      const snapshot = await buildWorkspaceSnapshot(state);
      res.json(snapshot);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to load workspace state',
      });
    }
  });

  // POST /api/tasks — creates a task using the live on-disk src/workspace/taskReducer.ts
  app.post('/api/tasks', async (req, res) => {
    try {
      const { title, category, priority } = req.body as {
        title?: string;
        category?: string;
        priority?: TaskPriority;
      };
      if (typeof title !== 'string' || !title.trim()) {
        res.status(400).json({ error: 'Task title is required and cannot be empty.' });
        return;
      }

      const state = loadPersistedState();
      const liveReducer = await loadLiveTaskReducer();
      const newTask = liveReducer.createTaskRecord({
        title,
        category: typeof category === 'string' && category.trim() ? category.trim() : 'Verification',
        priority: priority === 'high' || priority === 'medium' || priority === 'low' ? priority : 'medium',
      });

      const previousCount = state.tasks.length;
      state.tasks = liveReducer.applyAddTask(state.tasks, newTask);
      const addedCountDelta = state.tasks.length - previousCount;
      savePersistedState(state);

      const snapshot = await buildWorkspaceSnapshot(state);
      res.status(201).json({
        task: newTask,
        addedToBoard: addedCountDelta > 0,
        snapshot,
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Failed to create task',
      });
    }
  });

  // PATCH /api/tasks/:id/toggle — toggles task completion via live on-disk taskReducer.ts
  app.patch('/api/tasks/:id/toggle', async (req, res) => {
    try {
      const taskId = req.params.id;
      const state = loadPersistedState();
      if (!state.tasks.some((t) => t.id === taskId)) {
        res.status(404).json({ error: `Task "${taskId}" not found.` });
        return;
      }
      const liveReducer = await loadLiveTaskReducer();
      state.tasks = liveReducer.applyToggleTask(state.tasks, taskId);
      savePersistedState(state);

      const snapshot = await buildWorkspaceSnapshot(state);
      res.json({ snapshot });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to toggle task',
      });
    }
  });

  // DELETE /api/tasks/:id — deletes task via live on-disk taskReducer.ts
  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      const taskId = req.params.id;
      const state = loadPersistedState();
      if (!state.tasks.some((t) => t.id === taskId)) {
        res.status(404).json({ error: `Task "${taskId}" not found.` });
        return;
      }
      const liveReducer = await loadLiveTaskReducer();
      state.tasks = liveReducer.applyDeleteTask(state.tasks, taskId);
      savePersistedState(state);

      const snapshot = await buildWorkspaceSnapshot(state);
      res.json({ snapshot });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to delete task',
      });
    }
  });

  // POST /api/regression/inject — injects the reproducible Add Task bug into src/workspace/taskReducer.ts on disk
  app.post('/api/regression/inject', async (_req, res) => {
    try {
      const state = loadPersistedState();
      fs.writeFileSync(REDUCER_FILE, REGRESSION_TASK_REDUCER_SOURCE, 'utf8');
      state.hasRepairedInSession = false;
      state.activeDiff = REGRESSION_UNIFIED_DIFF;

      const nextSeq = state.timeline.length + 1;
      state.timeline.push({
        id: `evt-reg-${Date.now()}`,
        sequenceNumber: nextSeq,
        timestamp: new Date().toISOString(),
        kind: 'regression_injected',
        title: 'Regression injected into src/workspace/taskReducer.ts',
        summary:
          'Modified applyAddTask(tasks, _newTask) to return [...tasks] without prepending _newTask. Clicking "Add Task" now silently drops new tasks.',
        codeStateAfter: 'regression_injected',
      });

      savePersistedState(state);
      const snapshot = await buildWorkspaceSnapshot(state);
      res.json({ snapshot });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to inject regression',
      });
    }
  });

  // POST /api/kane/verify — safely invokes the fixed Kane CLI verification flow against http://localhost:3000
  app.post('/api/kane/verify', async (_req, res) => {
    try {
      const state = loadPersistedState();
      const { codeState } = getCurrentCodeState(state.hasRepairedInSession);
      const nextRunNumber = state.runHistory.length + 1;

      const runResult = await executeKaneVerification({
        runNumber: nextRunNumber,
        targetUrl: `http://localhost:${PORT}`,
        codeStateAtRun: codeState,
      });

      // Reload state in case browser verification modified tasks during the test journey,
      // and clean up any leftover test task if the run failed mid-journey
      const freshState = loadPersistedState();
      freshState.tasks = freshState.tasks.filter(
        (t) => t.title !== 'Verify Kane flow regression check'
      );
      freshState.runHistory.push(runResult);

      const nextSeq = freshState.timeline.length + 1;
      if (runResult.overallStatus === 'passed') {
        freshState.timeline.push({
          id: `evt-run-${runResult.runNumber}-${Date.now()}`,
          sequenceNumber: nextSeq,
          timestamp: runResult.timestamp,
          kind: 'verification_pass',
          title: `Kane Verification Run #${runResult.runNumber} Passed`,
          summary: `All ${runResult.steps.length} browser flow steps in flows/task_board_flow_test.md passed (${runResult.durationMs}ms).`,
          runNumber: runResult.runNumber,
          codeStateAfter: codeState,
        });
      } else {
        const failedStep = runResult.steps.find((s) => s.status === 'failed');
        const stepLabel = failedStep
          ? `Step ${failedStep.stepIndex}: ${failedStep.heading}`
          : 'Step 2: Create a New Task Item';
        freshState.timeline.push({
          id: `evt-run-${runResult.runNumber}-${Date.now()}`,
          sequenceNumber: nextSeq,
          timestamp: runResult.timestamp,
          kind: 'verification_fail',
          title: `Kane Verification Run #${runResult.runNumber} Failed at ${stepLabel}`,
          summary:
            runResult.failureSummary ||
            'Task did not appear in DOM task board after clicking Add Task.',
          runNumber: runResult.runNumber,
          failedStep: stepLabel,
          codeStateAfter: codeState,
        });
      }

      savePersistedState(freshState);
      const snapshot = await buildWorkspaceSnapshot(freshState);
      res.json({ run: runResult, snapshot });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to execute Kane verification',
      });
    }
  });

  // POST /api/agent/repair — reads latest Kane run failure record & repairs src/workspace/taskReducer.ts on disk
  app.post('/api/agent/repair', async (_req, res) => {
    try {
      const state = loadPersistedState();
      const { sourceCode } = getCurrentCodeState(state.hasRepairedInSession);

      // Prefer latest saved run artifact on disk (`data/latest-kane-run.json`)
      let latestRun: KaneVerificationRun | null =
        state.runHistory.length > 0 ? state.runHistory[state.runHistory.length - 1] : null;
      if (fs.existsSync(LATEST_RUN_FILE)) {
        try {
          latestRun = JSON.parse(fs.readFileSync(LATEST_RUN_FILE, 'utf8')) as KaneVerificationRun;
        } catch {
          // fallback to in-memory runHistory
        }
      }

      const { repairedSource, record } = buildAgentRepairPlan(sourceCode, latestRun);
      fs.writeFileSync(REDUCER_FILE, repairedSource, 'utf8');

      state.hasRepairedInSession = true;
      state.activeDiff = REPAIR_UNIFIED_DIFF;
      state.repairs.push(record);

      const nextSeq = state.timeline.length + 1;
      state.timeline.push({
        id: `evt-repair-${Date.now()}`,
        sequenceNumber: nextSeq,
        timestamp: record.timestamp,
        kind: 'agent_repair',
        title: `Repaired ${TARGET_REDUCER_PATH} using Kane failure evidence`,
        summary: record.explanation,
        runNumber: record.triggeredByRunNumber ?? undefined,
        failedStep: record.failedStepHeading,
        agentLabel: record.agentLabel,
        codeStateAfter: 'repaired',
      });

      savePersistedState(state);
      const snapshot = await buildWorkspaceSnapshot(state);
      res.json({ repair: record, snapshot });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Failed to execute agent repair',
      });
    }
  });

  // POST /api/workspace/reset — restores initial healthy code, seed tasks, and clean run history
  app.post('/api/workspace/reset', async (_req, res) => {
    try {
      fs.writeFileSync(REDUCER_FILE, HEALTHY_TASK_REDUCER_SOURCE, 'utf8');
      if (fs.existsSync(LATEST_RUN_FILE)) {
        try {
          fs.unlinkSync(LATEST_RUN_FILE);
        } catch {
          // ignore
        }
      }
      const fresh = createInitialState();
      savePersistedState(fresh);
      const snapshot = await buildWorkspaceSnapshot(fresh);
      res.json({ snapshot });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to reset workspace',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FlowPatch server running on http://localhost:${PORT}`);
  });
}

startServer();
