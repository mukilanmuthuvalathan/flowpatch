import React, { useState } from 'react';
import {
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  FileDiff,
  Code2,
  History,
} from 'lucide-react';
import type {
  CodePatchState,
  KaneVerificationRun,
  RepairRecord,
  TimelineEvent,
} from '../types/flowpatch';

interface RunHistoryAndRepairPanelProps {
  mode?: 'repair' | 'history' | 'both';
  codeState: CodePatchState;
  targetFilePath: string;
  currentSourceCode: string;
  activeDiff: string;
  runHistory: KaneVerificationRun[];
  repairs: RepairRecord[];
  timeline: TimelineEvent[];
  isRepairing: boolean;
  onRepair: () => Promise<void>;
}

export const RunHistoryAndRepairPanel: React.FC<RunHistoryAndRepairPanelProps> = ({
  mode = 'both',
  codeState,
  targetFilePath,
  currentSourceCode,
  activeDiff,
  runHistory,
  repairs,
  timeline,
  isRepairing,
  onRepair,
}) => {
  const [inspectorTab, setInspectorTab] = useState<'diff' | 'source'>('diff');
  const latestRepair = repairs.length > 0 ? repairs[repairs.length - 1] : null;
  const latestRun = runHistory.length > 0 ? runHistory[runHistory.length - 1] : null;
  const showRepair = mode === 'both' || mode === 'repair';
  const showHistory = mode === 'both' || mode === 'history';

  return (
    <div className="flex flex-col gap-6">
      {/* Agent Feedback Loop & Repair Summary Card */}
      {showRepair && (
      <section
        data-testid="agent-repair-panel"
        aria-labelledby="agent-repair-heading"
        className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
              <span>Agent Feedback Loop</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300 font-medium">
                Local Demo Agent (Deterministic Code Repair)
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Input: data/latest-kane-run.json</span>
            </div>
            <h2 id="agent-repair-heading" className="text-lg font-semibold text-slate-100">
              Failure-to-Patch Repair Loop
            </h2>
          </div>

          <button
            type="button"
            data-testid="panel-let-agent-repair-button"
            onClick={onRepair}
            disabled={isRepairing || codeState !== 'regression_injected'}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{isRepairing ? 'Applying Code Fix...' : 'Let agent repair'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Honest disclosure: This repair action runs a deterministic local patch engine (labeled as{' '}
          <strong className="text-slate-200">Local Demo Agent</strong>) so judges can run FlowPatch
          offline without paid LLM API keys. It reads the latest Kane CLI run artifact (
          <code className="text-sky-300">data/latest-kane-run.json</code>), maps the failing step
          to <code className="text-sky-300">{targetFilePath}</code>, and writes the code fix to disk.
        </p>

        {codeState === 'regression_injected' && (
          <div
            data-testid="regression-ready-for-repair"
            className="rounded-lg p-4 bg-amber-950/25 border border-amber-800/60 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-amber-300">
                Active Regression Detected in {targetFilePath}
              </span>
              <span className="text-xs font-mono text-amber-400">
                {latestRun && latestRun.overallStatus === 'failed'
                  ? `Linked to Failing Run #${latestRun.runNumber}`
                  : 'Run Kane verification to capture failure evidence'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {latestRun && latestRun.overallStatus === 'failed'
                ? `Latest Kane Run #${latestRun.runNumber} failed at Step ${latestRun.failedStepIndex ?? 2} ("Create a New Task Item"). Click "Let agent repair" to patch applyAddTask() in ${targetFilePath}.`
                : `applyAddTask() currently returns [...tasks] without appending newTask. Click "Run Kane verification" to record the browser failure, then click "Let agent repair".`}
            </p>
          </div>
        )}

        {latestRepair && (
          <div
            data-testid="latest-repair-summary"
            className="rounded-lg p-4 bg-emerald-950/20 border border-emerald-800/60 flex flex-col gap-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-emerald-300">
                Latest Patch Applied by {latestRepair.agentLabel}
              </span>
              <span className="font-mono text-slate-400 tabular-nums">
                {latestRepair.triggeredByRunNumber
                  ? `Resolved Run #${latestRepair.triggeredByRunNumber} (${latestRepair.failedStepHeading})`
                  : latestRepair.failedStepHeading}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-slate-100">Diagnosis:</strong> {latestRepair.diagnosis}
            </p>
            <p className="text-xs text-emerald-200 leading-relaxed">
              <strong className="text-emerald-100">Applied Fix:</strong> {latestRepair.explanation}
            </p>
          </div>
        )}

        {/* Live Source & Unified Diff Inspector */}
        <div className="flex flex-col gap-2.5 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>{targetFilePath}</span>
              <span aria-hidden="true">·</span>
              <span>
                {codeState === 'regression_injected'
                  ? 'Regression Diff'
                  : codeState === 'repaired'
                  ? 'Repair Patch Diff'
                  : 'Clean Working Source'}
              </span>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setInspectorTab('diff')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  inspectorTab === 'diff'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileDiff className="w-3.5 h-3.5" />
                <span>Unified Diff</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('source')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  inspectorTab === 'source'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Live File Source</span>
              </button>
            </div>
          </div>

          {inspectorTab === 'diff' ? (
            <pre
              data-testid="active-code-diff"
              className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed text-slate-300"
            >
              {activeDiff
                ? activeDiff.split('\n').map((line, i) => {
                    const cls = line.startsWith('+') && !line.startsWith('+++')
                      ? 'text-emerald-300 bg-emerald-950/40 block px-1 -mx-1'
                      : line.startsWith('-') && !line.startsWith('---')
                      ? 'text-rose-300 bg-rose-950/40 block px-1 -mx-1'
                      : line.startsWith('@@')
                      ? 'text-sky-400 block'
                      : 'text-slate-400 block';
                    return (
                      <span key={i} className={cls}>
                        {line}
                      </span>
                    );
                  })
                : '// No diff active — src/workspace/taskReducer.ts is at initial working baseline.\n// Click "Simulate regression" to inject the reproducible bug into applyAddTask().'}
            </pre>
          ) : (
            <pre
              data-testid="live-source-code"
              className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed text-slate-300 max-h-72"
            >
              {currentSourceCode}
            </pre>
          )}
        </div>
      </section>
      )}

      {/* Run & Repair History Timeline */}
      {showHistory && (
      <section
        data-testid="run-history-panel"
        aria-labelledby="run-history-heading"
        className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>Audit Log</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{runHistory.length} Kane runs</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{repairs.length} agent repairs</span>
            </div>
            <h2 id="run-history-heading" className="text-lg font-semibold text-slate-100">
              Verification & Repair Run History
            </h2>
          </div>

          <History className="w-4 h-4 text-slate-400" />
        </div>

        <div data-testid="timeline-event-list" className="divide-y divide-slate-800/80">
          {[...timeline].reverse().map((evt) => {
            return (
              <div
                key={evt.id}
                data-testid={`timeline-event-${evt.kind}`}
                className="py-3.5 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {evt.kind === 'verification_pass' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : evt.kind === 'verification_fail' ? (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    ) : evt.kind === 'agent_repair' ? (
                      <Wrench className="w-4 h-4 text-sky-400" />
                    ) : evt.kind === 'regression_injected' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <RotateCcw className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-slate-400 tabular-nums">
                        #{String(evt.sequenceNumber).padStart(2, '0')}
                      </span>
                      <span className="text-sm font-medium text-slate-100">{evt.title}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{evt.summary}</p>
                    {(evt.failedStep || evt.agentLabel) && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                        {evt.failedStep && <span className="font-mono">{evt.failedStep}</span>}
                        {evt.failedStep && evt.agentLabel && <span aria-hidden="true">·</span>}
                        {evt.agentLabel && <span>{evt.agentLabel}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0 text-xs font-mono tabular-nums text-slate-400">
                  <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  {evt.runNumber && (
                    <span
                      className={
                        evt.kind === 'verification_pass'
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }
                    >
                      Run #{evt.runNumber}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      )}
    </div>
  );
};
