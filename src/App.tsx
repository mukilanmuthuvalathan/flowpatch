import { useCallback, useEffect, useState } from 'react';
import { Play, Bug, Wrench, RotateCcw, AlertCircle } from 'lucide-react';
import type { TaskPriority, WorkspaceSnapshot } from './types/flowpatch';
import { TaskBoardPanel } from './components/TaskBoardPanel';
import { KaneVerificationPanel } from './components/KaneVerificationPanel';
import { RunHistoryAndRepairPanel } from './components/RunHistoryAndRepairPanel';
import { DemoGuidePanel } from './components/DemoGuidePanel';

export default function App() {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchWorkspace = useCallback(async () => {
    try {
      const res = await fetch('/api/workspace');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as WorkspaceSnapshot;
      setSnapshot(data);
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Unable to load FlowPatch workspace.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const handleAddTask = async (input: {
    title: string;
    category: string;
    priority: TaskPriority;
  }): Promise<{ addedToBoard: boolean; error?: string }> => {
    setIsMutating(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        return { addedToBoard: false, error: data.error || 'Failed to add task' };
      }
      setSnapshot(data.snapshot);
      return { addedToBoard: Boolean(data.addedToBoard) };
    } catch (err) {
      return {
        addedToBoard: false,
        error: err instanceof Error ? err.message : 'Network error adding task',
      };
    } finally {
      setIsMutating(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    setIsMutating(true);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/toggle`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle task');
      setSnapshot(data.snapshot);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to toggle task');
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setIsMutating(true);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete task');
      setSnapshot(data.snapshot);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setIsMutating(false);
    }
  };

  const handleRunVerification = async () => {
    setIsVerifying(true);
    setErrorBanner(null);
    setStatusMessage('Running Kane CLI browser flow verification against http://localhost:3000...');
    try {
      const res = await fetch('/api/kane/verify', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kane verification failed to start');
      setSnapshot(data.snapshot);
      const run = data.run;
      setStatusMessage(
        run.overallStatus === 'passed'
          ? `Run #${run.runNumber} PASSED (${run.durationMs}ms): All 4 steps in flows/task_board_flow_test.md succeeded.`
          : `Run #${run.runNumber} FAILED at Step ${run.failedStepIndex ?? 2}: ${run.failureSummary}`
      );
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Verification error');
      setStatusMessage(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateRegression = async () => {
    setIsMutating(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/regression/inject', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to inject regression');
      setSnapshot(data.snapshot);
      setStatusMessage(
        'Regression injected into src/workspace/taskReducer.ts: applyAddTask() now drops newly created tasks. Click "Run Kane verification" to catch the regression.'
      );
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to inject regression');
    } finally {
      setIsMutating(false);
    }
  };

  const handleLetAgentRepair = async () => {
    setIsRepairing(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/agent/repair', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Agent repair failed');
      setSnapshot(data.snapshot);
      setStatusMessage(
        `Local Demo Agent patched src/workspace/taskReducer.ts using Kane failure evidence. Click "Run Kane verification" to verify the fix.`
      );
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to repair regression');
    } finally {
      setIsRepairing(false);
    }
  };

  const handleResetWorkspace = async () => {
    setIsMutating(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/workspace/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset workspace');
      setSnapshot(data.snapshot);
      setStatusMessage(
        'Workspace reset to initial healthy state with seed tasks and clean run history.'
      );
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to reset workspace');
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800/90 bg-slate-950/90">
        {/* Zone 1: Brand logo */}
        <a
          href="#workspace-top"
          aria-label="FlowPatch"
          className="inline-flex items-center shrink-0 rounded-lg bg-white ring-1 ring-slate-700/80 shadow-sm overflow-hidden h-10 w-[148px] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <img
            src="/assets/aistudio/image_c6598baf.png"
            alt="FlowPatch"
            className="w-full h-full object-cover object-[50%_49%] scale-[1.40]"
          />
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400"
        >
          <a
            href="#task-board-heading"
            className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Task Workspace
          </a>
          <a
            href="#kane-panel-heading"
            className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Kane Verification
          </a>
          <a
            href="#agent-repair-heading"
            className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Repair Loop
          </a>
          <a
            href="#demo-guide-section"
            className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Demo Script
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            data-testid="header-run-kane-button"
            onClick={handleRunVerification}
            disabled={isVerifying || isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isVerifying ? 'Verifying Flow...' : 'Run Kane verification'}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main id="workspace-top" className="flex-1 max-w-[1380px] w-full mx-auto px-6 py-6 flex flex-col gap-6">
        {/* Hero / Lifecycle Control Strip */}
        <section
          aria-label="FlowPatch Control Bar"
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div className="flex flex-col gap-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span data-testid="local-demo-status" className="text-sky-400 font-semibold">
                Local demo
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Kane CLI {snapshot?.cliInfo.installed ? `v${snapshot.cliInfo.version}` : 'Ready'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Agent: Local Demo Agent (Deterministic Repair)</span>
              <span aria-hidden="true">·</span>
              <span
                data-testid="hero-code-state"
                className={
                  snapshot?.codeState === 'regression_injected'
                    ? 'text-amber-400 font-medium'
                    : 'text-emerald-400 font-medium'
                }
              >
                {snapshot?.codeState === 'regression_injected'
                  ? 'Regression Active in applyAddTask()'
                  : snapshot?.codeState === 'repaired'
                  ? 'Flow Repaired & Ready'
                  : 'Baseline Flow Healthy'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight font-display">
              Make a change. Let Kane check the flow. Fix what breaks.
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed">
              Trigger a real code regression in the Sprint Task Board, run Kane CLI to detect the broken browser step, apply a deterministic code repair from the failure artifact, and re-run Kane to verify the fix.
            </p>
          </div>

          {/* 4 Core Demo Lifecycle Controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              data-testid="run-kane-verification-button"
              onClick={handleRunVerification}
              disabled={isVerifying || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isVerifying ? 'Running Kane CLI...' : 'Run Kane verification'}</span>
            </button>

            <button
              type="button"
              data-testid="simulate-regression-button"
              onClick={handleSimulateRegression}
              disabled={
                isMutating ||
                isVerifying ||
                isLoading ||
                snapshot?.codeState === 'regression_injected'
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-amber-200 bg-amber-950/60 hover:bg-amber-900/70 border border-amber-700/60 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Bug className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate regression</span>
            </button>

            <button
              type="button"
              data-testid="let-agent-repair-button"
              onClick={handleLetAgentRepair}
              disabled={
                isRepairing ||
                isVerifying ||
                isLoading ||
                snapshot?.codeState !== 'regression_injected'
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-700/60 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isRepairing ? 'Repairing...' : 'Let agent repair'}</span>
            </button>

            <button
              type="button"
              data-testid="reset-demo-button"
              onClick={handleResetWorkspace}
              disabled={isMutating || isVerifying || isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </section>

        {/* Feedback / Status Banner */}
        {(errorBanner || statusMessage) && (
          <div
            role="status"
            data-testid="workspace-status-banner"
            className={`px-4 py-3 rounded-lg border text-xs flex items-center justify-between gap-4 ${
              errorBanner
                ? 'bg-rose-950/40 border-rose-800/70 text-rose-200'
                : 'bg-slate-900 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {errorBanner && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{errorBanner || statusMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorBanner(null);
                setStatusMessage(null);
              }}
              className="text-slate-400 hover:text-slate-200 text-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main 2-Column Workspace Grid */}
        {isLoading || !snapshot ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 h-96 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse" />
            <div className="lg:col-span-6 h-96 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Demo Application Under Test (Task Board) + Repair Patch Inspector */}
              <div className="lg:col-span-6 flex flex-col gap-6">
                <TaskBoardPanel
                  tasks={snapshot.tasks}
                  codeState={snapshot.codeState}
                  isMutating={isMutating}
                  onAddTask={handleAddTask}
                  onToggleTask={handleToggleTask}
                  onDeleteTask={handleDeleteTask}
                />

                <RunHistoryAndRepairPanel
                  mode="repair"
                  codeState={snapshot.codeState}
                  targetFilePath={snapshot.targetFilePath}
                  currentSourceCode={snapshot.currentSourceCode}
                  activeDiff={snapshot.activeDiff}
                  runHistory={snapshot.runHistory}
                  repairs={snapshot.repairs}
                  timeline={snapshot.timeline}
                  isRepairing={isRepairing}
                  onRepair={handleLetAgentRepair}
                />
              </div>

              {/* Right Column: Kane CLI Verification Panel + Chronological Run History */}
              <div className="lg:col-span-6 flex flex-col gap-6">
                <KaneVerificationPanel
                  parsedFlow={snapshot.parsedFlow}
                  latestRun={snapshot.latestRun}
                  isVerifying={isVerifying}
                  cliInfo={snapshot.cliInfo}
                />

                <RunHistoryAndRepairPanel
                  mode="history"
                  codeState={snapshot.codeState}
                  targetFilePath={snapshot.targetFilePath}
                  currentSourceCode={snapshot.currentSourceCode}
                  activeDiff={snapshot.activeDiff}
                  runHistory={snapshot.runHistory}
                  repairs={snapshot.repairs}
                  timeline={snapshot.timeline}
                  isRepairing={isRepairing}
                  onRepair={handleLetAgentRepair}
                />
              </div>
            </div>

            {/* Judge Walkthrough, 3-Minute Demo Script, and Submission Paragraph */}
            <DemoGuidePanel />
          </>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 mt-auto">
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>FlowPatch — Local Kane CLI & Automated Repair Feedback Loop</span>
          <div className="flex items-center gap-3 font-mono">
            <span>flows/task_board_flow_test.md</span>
            <span aria-hidden="true">·</span>
            <span>src/workspace/taskReducer.ts</span>
            <span aria-hidden="true">·</span>
            <span>data/latest-kane-run.json</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
