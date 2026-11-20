import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Terminal,
  ChevronDown,
  ChevronUp,
  FileCode2,
} from 'lucide-react';
import type { KaneVerificationRun, ParsedTestMdFlow } from '../types/flowpatch';

interface KaneVerificationPanelProps {
  parsedFlow: ParsedTestMdFlow;
  latestRun: KaneVerificationRun | null;
  isVerifying: boolean;
  cliInfo: {
    installed: boolean;
    version: string;
    binaryPath: string;
    authStatus: string;
    verifyCommand: string;
    directKaneCommand: string;
  };
}

export const KaneVerificationPanel: React.FC<KaneVerificationPanelProps> = ({
  parsedFlow,
  latestRun,
  isVerifying,
  cliInfo,
}) => {
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [showFlowSource, setShowFlowSource] = useState(false);

  return (
    <section
      data-testid="kane-verification-panel"
      aria-labelledby="kane-panel-heading"
      className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mb-1">
            <span>Kane CLI Flow Runner</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{parsedFlow.filePath}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              {cliInfo.installed ? `kane-cli v${cliInfo.version}` : 'CLI unavailable'}
            </span>
            {cliInfo.authStatus === 'authenticated' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400 font-medium">TestMu AI Authenticated</span>
              </>
            )}
          </div>
          <h2 id="kane-panel-heading" className="text-lg font-semibold text-slate-100">
            Browser Flow Verification
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
          {isVerifying ? (
            <span className="text-sky-400">
              {cliInfo.authStatus === 'authenticated'
                ? 'Running authenticated Kane CLI flow...'
                : 'Executing headless Chromium flow...'}
            </span>
          ) : latestRun ? (
            <>
              <span>Run #{latestRun.runNumber}</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  latestRun.overallStatus === 'passed' ? 'text-emerald-400' : 'text-rose-400'
                }
              >
                Exit {latestRun.cliDiagnostics.exitCode}
              </span>
              <span aria-hidden="true">·</span>
              <span>{latestRun.durationMs}ms</span>
            </>
          ) : (
            <span>{parsedFlow.steps.length} steps · Headless Chromium</span>
          )}
        </div>
      </div>

      {/* Latest Run Verdict Strip */}
      {latestRun ? (
        <div
          data-testid="latest-run-verdict"
          className={`rounded-lg p-4 border ${
            latestRun.overallStatus === 'passed'
              ? 'bg-emerald-950/25 border-emerald-800/60'
              : 'bg-rose-950/30 border-rose-800/70'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {latestRun.overallStatus === 'passed' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span
                data-testid="verdict-status-text"
                className={`text-sm font-semibold ${
                  latestRun.overallStatus === 'passed' ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                Run #{latestRun.runNumber}:{' '}
                {latestRun.overallStatus === 'passed'
                  ? 'PASSED — All 4 browser flow steps verified'
                  : `FAILED — Step ${latestRun.failedStepIndex ?? 2} failed verification`}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
              <span>{latestRun.durationMs}ms</span>
              <span aria-hidden="true">·</span>
              <span>{new Date(latestRun.timestamp).toLocaleTimeString()}</span>
              <span aria-hidden="true">·</span>
              <span>Artifact: {latestRun.savedArtifactPath}</span>
            </div>
          </div>

          {latestRun.failureSummary && (
            <div
              data-testid="verdict-failure-summary"
              className="mt-3 pt-3 border-t border-rose-900/50 text-xs text-rose-200 font-mono leading-relaxed"
            >
              {latestRun.failureSummary}
            </div>
          )}

          {latestRun.cliDiagnostics.authGuidance && (
            <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
              {latestRun.cliDiagnostics.authGuidance}
            </p>
          )}
        </div>
      ) : (
        <div
          data-testid="no-run-yet-banner"
          className="rounded-lg p-4 bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between gap-4"
        >
          <span>
            No verification run recorded in this session yet. Click{' '}
            <strong className="text-slate-200">Run Kane verification</strong> to exercise{' '}
            <code className="text-sky-300">{parsedFlow.filePath}</code> in headless Chromium.
          </span>
          <span className="font-mono text-slate-500 shrink-0">{parsedFlow.steps.length} steps ready</span>
        </div>
      )}

      {/* Flow Steps Checklist */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Verified User Journey Steps ({parsedFlow.steps.length})</span>
          <span className="font-mono">Target: {parsedFlow.frontmatter.url}</span>
        </div>

        <div data-testid="kane-step-list" className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg bg-slate-950/60">
          {parsedFlow.steps.map((flowStep) => {
            const stepResult = latestRun?.steps.find((s) => s.stepIndex === flowStep.index);
            const status = stepResult?.status;

            return (
              <div
                key={flowStep.index}
                data-testid={`kane-step-${flowStep.index}`}
                className="p-3.5 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {status === 'passed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <MinusCircle className="w-4 h-4 text-slate-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-slate-400 tabular-nums">
                        0{flowStep.index}.
                      </span>
                      <h3 className="text-sm font-medium text-slate-100">{flowStep.heading}</h3>
                    </div>

                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {stepResult ? stepResult.remark : flowStep.objective}
                    </p>

                    {stepResult?.domObservation && (
                      <p className="text-xs font-mono text-slate-400 mt-1.5 bg-slate-900/90 border border-slate-800/80 rounded px-2.5 py-1">
                        {stepResult.domObservation}
                      </p>
                    )}

                    {stepResult?.failureReason && (
                      <p
                        data-testid={`kane-step-${flowStep.index}-error`}
                        className="text-xs font-mono text-rose-300 mt-1.5 bg-rose-950/50 border border-rose-900/60 rounded px-2.5 py-1.5"
                      >
                        {stepResult.failureReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0 text-xs font-mono tabular-nums">
                  <span
                    className={
                      status === 'passed'
                        ? 'text-emerald-400'
                        : status === 'failed'
                        ? 'text-rose-400 font-semibold'
                        : 'text-slate-500'
                    }
                  >
                    {status ? status.toUpperCase() : 'READY'}
                  </span>
                  {stepResult && stepResult.durationMs > 0 && (
                    <span className="text-slate-500">{stepResult.durationMs}ms</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CLI Command & Expandable Raw Stream / Flow Definition */}
      <div className="flex flex-col gap-2 pt-1 border-t border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-mono truncate">
            <Terminal className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">{cliInfo.directKaneCommand}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFlowSource((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>{showFlowSource ? 'Hide _test.md' : 'View _test.md'}</span>
            </button>

            {latestRun && (
              <button
                type="button"
                onClick={() => setShowRawOutput((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>{showRawOutput ? 'Hide NDJSON log' : 'View NDJSON log'}</span>
                {showRawOutput ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {showFlowSource && (
          <pre className="mt-2 p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
            {parsedFlow.rawMarkdown}
          </pre>
        )}

        {showRawOutput && latestRun && (
          <div className="mt-2 p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto flex flex-col gap-2">
            <div className="text-slate-400 border-b border-slate-800 pb-1.5">
              $ {latestRun.cliDiagnostics.commandExecuted} (exit {latestRun.cliDiagnostics.exitCode})
            </div>
            {latestRun.cliDiagnostics.rawStderr && (
              <div className="text-amber-300/90 whitespace-pre-wrap">
                {latestRun.cliDiagnostics.rawStderr}
              </div>
            )}
            <pre className="text-sky-200/90 whitespace-pre-wrap leading-relaxed">
              {latestRun.ndjsonStream.join('\n')}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
};
