import React from 'react';
import { Terminal, BookOpen, CheckSquare } from 'lucide-react';

export const DemoGuidePanel: React.FC = () => {
  return (
    <section
      id="demo-guide-section"
      data-testid="demo-guide-panel"
      aria-labelledby="demo-guide-heading"
      className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-6"
    >
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <span>Hackathon Deliverables</span>
          <span aria-hidden="true">·</span>
          <span>Submission Summary</span>
          <span aria-hidden="true">·</span>
          <span>3-Minute Demo Script</span>
        </div>
        <h2 id="demo-guide-heading" className="text-lg font-semibold text-slate-100">
          Judge Walkthrough, CLI Commands & Submission Brief
        </h2>
      </div>

      {/* Submission Paragraph */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
          <BookOpen className="w-4 h-4" />
          <span>Submission Paragraph</span>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">
          <strong>FlowPatch</strong> is a local developer verification and automated repair workspace built for full-stack engineers and AI-assisted development teams who want to guarantee that code changes never silently break critical browser user journeys. It pairs the real <strong>Kane CLI</strong> (<code className="text-sky-300">@testmuai/kane-cli</code>) with a <strong>Local Demo Agent</strong> (deterministic AST/source patch repair engine, plus documented integration hooks for Claude Code, Cursor, and Gemini CLI) in a closed feedback loop. In FlowPatch, Kane CLI exercises a live Sprint Task Board application through a real headless Chromium browser and verifies a four-step end-to-end user journey defined in <code className="text-sky-300">flows/task_board_flow_test.md</code>: loading the task workspace, creating a new task item via the form, toggling the task status to Completed, and deleting the task. When a simulated regression breaks the <code className="text-sky-300">applyAddTask</code> reducer in <code className="text-sky-300">src/workspace/taskReducer.ts</code>, Kane catches the exact failing step and writes structured failure evidence to <code className="text-sky-300">data/latest-kane-run.json</code>, enabling the repair agent to automatically patch the source file on disk and prove the fix with a passing Kane verification rerun.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Three-Minute Demo Script */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <CheckSquare className="w-4 h-4" />
            <span>Three-Minute Judge Demo Script</span>
          </div>

          <ol className="text-xs text-slate-300 space-y-2.5 leading-relaxed list-decimal list-inside">
            <li>
              <strong className="text-slate-100">0:00–0:35 · Healthy Baseline & Manual Check:</strong>{' '}
              Show FlowPatch loaded in its healthy state (<code className="text-emerald-300">Source State: Healthy Working Code</code>). Add a task in the Sprint Task Board and mark it complete to show the live app working.
            </li>
            <li>
              <strong className="text-slate-100">0:35–1:10 · Passing Kane Verification (Run #1):</strong>{' '}
              Click <strong>Run Kane verification</strong>. Point out how FlowPatch invokes <code className="text-sky-300">kane-cli testmd run flows/task_board_flow_test.md</code> and exercises all 4 browser steps in headless Chromium, recording <strong>Run #1: PASSED</strong>.
            </li>
            <li>
              <strong className="text-slate-100">1:10–1:50 · Inject Reproducible Regression & Catch Failure (Run #2):</strong>{' '}
              Click <strong>Simulate regression</strong>. Inspect the Unified Diff showing <code className="text-rose-300">applyAddTask()</code> in <code className="text-sky-300">src/workspace/taskReducer.ts</code> modified on disk to drop new tasks. Click <strong>Run Kane verification</strong> again — watch <strong>Run #2: FAILED</strong> halt at <strong>Step 2: Create a New Task Item</strong> with DOM evidence showing 0 matching nodes.
            </li>
            <li>
              <strong className="text-slate-100">1:50–2:30 · Agent Feedback Loop & Real Source Repair:</strong>{' '}
              Click <strong>Let agent repair</strong>. Explain that the Local Demo Agent reads <code className="text-sky-300">data/latest-kane-run.json</code>, pinpoints Step 2’s failure to <code className="text-sky-300">applyAddTask()</code> in <code className="text-sky-300">src/workspace/taskReducer.ts</code>, and patches the file on disk.
            </li>
            <li>
              <strong className="text-slate-100">2:30–3:00 · Passing Rerun Proof (Run #3) & Reset:</strong>{' '}
              Click <strong>Run Kane verification</strong> one more time. Watch <strong>Run #3: PASSED</strong> verify all 4 steps in the browser and review the complete chronological audit trail in Run History. Click <strong>Reset demo</strong> to show repeatable local state.
            </li>
          </ol>
        </div>

        {/* Repository CLI Commands & Agent Connection */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
            <Terminal className="w-4 h-4" />
            <span>Terminal Verification & External Agent Connection</span>
          </div>

          <div className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
            <p className="text-slate-400">
              Run the complete application and execute Kane verification from your terminal:
            </p>
            <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-sky-200 overflow-x-auto">
{`# 1. Start FlowPatch local full-stack server (port 3000)
npm run dev

# 2. Run FlowPatch Kane CLI verification runner from terminal
npm run verify

# 3. Direct Kane CLI command (with TestMu AI login or LT credentials)
kane-cli testmd run flows/task_board_flow_test.md --headless --agent --url http://localhost:3000

# 4. Run unit tests for task reducer, flow parser, and repair engine
npm test`}
            </pre>
            <p className="text-slate-400">
              To connect an external AI coding agent (Claude Code, Cursor, or Gemini CLI), install the official Kane skill with <code className="text-sky-300">kane-cli install skill</code> or point your agent at <code className="text-sky-300">data/latest-kane-run.json</code> and <code className="text-sky-300">src/workspace/taskReducer.ts</code>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
