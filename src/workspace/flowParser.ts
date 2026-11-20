import type { KaneFlowStep, KaneStepResult, ParsedTestMdFlow, StepStatus } from '../types/flowpatch';

/**
 * Parses a real Kane CLI *_test.md file into structured frontmatter, title, and H2 step objectives.
 */
export function parseTestMdFlow(rawMarkdown: string, filePath: string = 'flows/task_board_flow_test.md'): ParsedTestMdFlow {
  const normalized = rawMarkdown.replace(/\r\n/g, '\n');
  const frontmatter = {
    mode: 'testing',
    url: 'http://localhost:3000',
    headless: true,
    max_steps: 25,
    tags: [] as string[],
  };

  let bodyContent = normalized;
  const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    const fmLines = fmMatch[1].split('\n');
    bodyContent = fmMatch[2];
    for (const line of fmLines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      const rawVal = line.slice(colonIdx + 1).trim();
      if (key === 'mode' && rawVal) frontmatter.mode = rawVal;
      if (key === 'url' && rawVal) frontmatter.url = rawVal;
      if (key === 'headless') frontmatter.headless = rawVal === 'true';
      if (key === 'max_steps') {
        const parsedNum = Number(rawVal);
        if (!Number.isNaN(parsedNum)) frontmatter.max_steps = parsedNum;
      }
      if (key === 'tags') {
        const cleaned = rawVal.replace(/^\[|\]$/g, '');
        frontmatter.tags = cleaned
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }
  }

  let title = 'FlowPatch Task Board Primary User Journey';
  const titleMatch = bodyContent.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  const steps: KaneFlowStep[] = [];
  const lines = bodyContent.split('\n');
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  const flushStep = () => {
    if (currentHeading !== null) {
      const objective = currentLines.join('\n').trim();
      steps.push({
        index: steps.length + 1,
        heading: currentHeading,
        objective,
      });
    }
  };

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      flushStep();
      currentHeading = h2Match[1].trim();
      currentLines = [];
    } else if (currentHeading !== null) {
      currentLines.push(line);
    }
  }
  flushStep();

  return {
    filePath,
    title,
    frontmatter,
    steps,
    rawMarkdown,
  };
}

/**
 * Parses NDJSON events emitted by `kane-cli --agent` (stream contract v1)
 * into structured step results and overall run verdict.
 */
export function parseKaneNdjsonStream(
  ndjsonLines: string[],
  flowSteps: KaneFlowStep[]
): {
  steps: KaneStepResult[];
  overallStatus: 'passed' | 'failed';
  failedStepIndex: number | null;
  failureSummary: string | null;
} {
  const stepMap = new Map<number, KaneStepResult>();
  for (const step of flowSteps) {
    stepMap.set(step.index, {
      stepIndex: step.index,
      heading: step.heading,
      objective: step.objective,
      status: 'skipped',
      durationMs: 0,
      remark: 'Not executed',
    });
  }

  let overallStatus: 'passed' | 'failed' = 'passed';
  let failedStepIndex: number | null = null;
  let failureSummary: string | null = null;
  let currentTestMdStep: number | null = null;
  const stepInnerActions = new Map<number, string[]>();

  for (const rawLine of ndjsonLines) {
    const trimmed = rawLine.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      const evt = JSON.parse(trimmed);

      // Untyped progress event from `kane-cli run --agent`: { step: 1, status: "done"|"failed"|"running", remark: "..." }
      if (!evt.type && typeof evt.step === 'number') {
        const existing = stepMap.get(evt.step);
        const mappedStatus: StepStatus =
          evt.status === 'done' || evt.status === 'passed'
            ? 'passed'
            : evt.status === 'failed'
            ? 'failed'
            : evt.status === 'running'
            ? 'running'
            : 'skipped';
        if (existing) {
          existing.status = mappedStatus;
          if (evt.remark) existing.remark = String(evt.remark);
          if (typeof evt.duration_ms === 'number') existing.durationMs = evt.duration_ms;
          if (evt.dom_observation) existing.domObservation = String(evt.dom_observation);
          if (mappedStatus === 'failed') {
            existing.failureReason = String(evt.failure_reason || evt.remark || 'Step failed');
            overallStatus = 'failed';
            if (failedStepIndex === null) failedStepIndex = evt.step;
            failureSummary = existing.failureReason;
          }
        }
        continue;
      }

      // `kane-cli testmd run --agent` events
      if (evt.type === 'test_md_step_start' && typeof evt.step_index === 'number') {
        currentTestMdStep = evt.step_index;
        stepInnerActions.set(evt.step_index, []);
        const existing = stepMap.get(evt.step_index);
        if (existing) {
          existing.status = 'running';
          if (evt.heading) existing.heading = String(evt.heading);
        }
      } else if (evt.type === 'step_end' && currentTestMdStep !== null) {
        const actions = stepInnerActions.get(currentTestMdStep);
        if (actions && evt.summary) {
          actions.push(String(evt.summary));
        }
      } else if (evt.type === 'run_end' && currentTestMdStep !== null) {
        // Embedded run_end closes the active testmd step and carries Kane's rich summary/reason
        const existing = stepMap.get(currentTestMdStep);
        if (existing) {
          const text = evt.one_liner || evt.summary || evt.reason;
          if (text) existing.remark = String(text);
          if (evt.status === 'failed' && (evt.reason || evt.summary)) {
            existing.failureReason = String(evt.reason || evt.summary);
          }
        }
      } else if (evt.type === 'test_md_step_end' && typeof evt.step_index === 'number') {
        const existing = stepMap.get(evt.step_index);
        if (existing) {
          const st: StepStatus =
            evt.status === 'passed' || evt.status === 'done'
              ? 'passed'
              : evt.status === 'failed'
              ? 'failed'
              : 'skipped';
          existing.status = st;
          if (typeof evt.duration_s === 'number') {
            existing.durationMs = Math.round(evt.duration_s * 1000);
          } else if (typeof evt.duration_ms === 'number') {
            existing.durationMs = evt.duration_ms;
          }
          if (evt.remark) {
            existing.remark = String(evt.remark);
          } else if (existing.remark === 'Not executed') {
            existing.remark =
              st === 'passed'
                ? 'Verified in real browser by Kane CLI.'
                : 'Step failed during Kane CLI browser execution.';
          }
          if (evt.dom_observation) {
            existing.domObservation = String(evt.dom_observation);
          } else {
            const actions = stepInnerActions.get(evt.step_index);
            if (actions && actions.length > 0) {
              existing.domObservation = `Kane actions: ${actions.slice(-3).join(' -> ')}`;
            }
          }
          if (st === 'failed') {
            existing.failureReason = String(
              evt.failure_reason ||
                existing.failureReason ||
                evt.remark ||
                existing.remark ||
                'Assertion failed during step execution'
            );
            overallStatus = 'failed';
            if (failedStepIndex === null) failedStepIndex = evt.step_index;
            failureSummary = existing.failureReason;
          }
        }
        currentTestMdStep = null;
      } else if (evt.type === 'test_md_done' || (evt.type === 'run_end' && currentTestMdStep === null)) {
        const finalVerdict = evt.overall_status || evt.status;
        if (finalVerdict === 'failed') {
          overallStatus = 'failed';
          if (!failureSummary && evt.reason) {
            failureSummary = String(evt.reason);
          }
        } else if (finalVerdict === 'passed' && failedStepIndex === null) {
          overallStatus = 'passed';
        }
      } else if (evt.type === 'error' && evt.message) {
        overallStatus = 'failed';
        if (!failureSummary) {
          failureSummary = String(evt.message);
        }
      }
    } catch {
      // Ignore malformed lines per Kane CLI stream contract
    }
  }

  const steps = Array.from(stepMap.values());
  if (steps.some((s) => s.status === 'failed')) {
    overallStatus = 'failed';
  }

  return {
    steps,
    overallStatus,
    failedStepIndex,
    failureSummary,
  };
}
