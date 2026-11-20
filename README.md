# FlowPatch — Kane CLI & Agent Regression Repair Loop

> **Make a change. Let Kane check the flow. Fix what breaks.**

FlowPatch is a local, self-contained developer tool and hackathon demonstration showing how **Kane CLI** (`@testmuai/kane-cli`) and a coding agent work together in a closed loop to detect, diagnose, and repair a real browser user-flow regression.

---

## Submission Summary Paragraph

**FlowPatch** is a local developer verification and automated repair workspace built for full-stack engineers and AI-assisted development teams who want to guarantee that code changes never silently break critical browser user journeys. It pairs the real **Kane CLI** (`@testmuai/kane-cli`) with a **Local Demo Agent** (a deterministic AST/source patch repair engine, with documented hooks to connect Claude Code, Cursor, or Gemini CLI) in a closed feedback loop. In FlowPatch, Kane CLI exercises a live Sprint Task Board application through a real headless Chromium browser and verifies a four-step end-to-end user journey defined in `flows/task_board_flow_test.md`: loading the task workspace, creating a new task item via the form, toggling the task status to Completed, and deleting the task. When a simulated regression breaks the `applyAddTask` reducer in `src/workspace/taskReducer.ts`, Kane catches the exact failing step and writes structured failure evidence to `data/latest-kane-run.json`, enabling the repair agent to automatically patch the source file on disk and prove the fix with a passing Kane verification rerun.

---

## Prerequisites

- **Node.js 20+** and **npm**
- **Kane CLI** (`@testmuai/kane-cli`):
  ```bash
  npm install -g --omit=optional @testmuai/kane-cli
  ```
- **Headless Chromium / Chrome** (for local browser flow execution)

---

## Quickstart (One Command to Launch)

1. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
2. Start the full-stack FlowPatch application on `http://localhost:3000`:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Core User Journey & Demo Steps

1. **Healthy Baseline**:
   - FlowPatch loads with `src/workspace/taskReducer.ts` in its healthy working state (`Source State: Healthy Working Code`).
   - In the **Sprint Task Board**, enter a task title (e.g., `"Verify webhook payload"`), click **Add Task**, and click its completion toggle to verify the task board works interactively.
2. **Passing Kane Verification (Run #1)**:
   - Click **Run Kane verification** in the UI (or run `npm run verify` in the terminal).
   - FlowPatch invokes `kane-cli testmd run flows/task_board_flow_test.md --headless --agent --url http://localhost:3000` and exercises all 4 browser steps against the live app.
   - The Verification Panel and Run History record **Run #1: PASSED**.
3. **Simulate Reproducible Regression**:
   - Click **Simulate regression**.
   - FlowPatch writes a real code bug to `src/workspace/taskReducer.ts` on disk (`applyAddTask` returns `[...tasks]` without prepending `newTask`).
   - Inspect the **Unified Diff** in the Failure-to-Patch Repair Loop panel to view the exact code change.
4. **Failing Kane Verification (Run #2)**:
   - Click **Run Kane verification** again.
   - The browser verification runs Step 1 (`Verify Task Board Workspace Loads` -> `PASSED`), then fails at **Step 2 (`Create a New Task Item` -> `FAILED`)** because clicking **Add Task** in the live browser fails to add `"Verify Kane flow regression check"` to `[data-testid="task-list"]`.
   - The structured failure record is saved to `data/latest-kane-run.json` and **Run #2: FAILED** appears in Run History.
5. **Agent Feedback Loop & Real Source Repair**:
   - Click **Let agent repair**.
   - The **Local Demo Agent (Deterministic Code Repair)** reads `data/latest-kane-run.json`, diagnoses that Step 2 failed due to the no-op shallow copy in `applyAddTask()` inside `src/workspace/taskReducer.ts`, and patches `src/workspace/taskReducer.ts` on disk back to `return [newTask, ...tasks];`.
6. **Passing Rerun Proof (Run #3)**:
   - Click **Run Kane verification** once more.
   - All 4 browser steps pass against the repaired code (**Run #3: PASSED**).
7. **Reset**:
   - Click **Reset** at any time to restore the initial seed tasks, working code, and clean run history.

---

## Kane CLI Integration & Commands

FlowPatch includes a persisted Kane CLI flow definition at [`flows/task_board_flow_test.md`](./flows/task_board_flow_test.md) using the official `kane-cli testmd` format:

```markdown
---
mode: testing
url: http://localhost:3000
headless: true
max_steps: 25
tags: [regression, task-board, flowpatch]
---

# FlowPatch Task Board Primary User Journey

## Verify Task Board Workspace Loads
Navigate to http://localhost:3000 and verify the Sprint Task Board workspace is visible with the New Task title input and the "Add Task" button.

## Create a New Task Item
Type "Verify Kane flow regression check" into the New Task title input and click the "Add Task" button.
Verify that "Verify Kane flow regression check" appears in the task board list with status "Active".

## Complete the Created Task
Click the "Mark complete" toggle for task "Verify Kane flow regression check".
Verify that "Verify Kane flow regression check" shows status "Completed".

## Delete the Completed Task
Click the "Delete task" button for "Verify Kane flow regression check".
Verify that "Verify Kane flow regression check" is removed from the task board list.
```

### Running Verification from the Repository Terminal

- **Run the FlowPatch Kane Verification Runner** (invokes `kane-cli` and automatically uses the local headless Chromium fallback if TestMu AI cloud credentials are not configured):
  ```bash
  npm run verify
  ```
- **Run `kane-cli` Directly** (when authenticated with `kane-cli login` or `LT_USERNAME` / `LT_ACCESS_KEY`):
  ```bash
  npm run verify:kane
  # Equivalent to:
  kane-cli testmd run flows/task_board_flow_test.md --headless --agent --url http://localhost:3000
  ```
- **Run Unit Tests** (fast `node:test` suite for `taskReducer`, `flowParser`, and `repairEngine`):
  ```bash
  npm test
  ```

---

## Connecting Your Own AI Coding Agent (Claude Code / Cursor / Gemini CLI)

1. Install the official Kane CLI agent skill:
   ```bash
   kane-cli install skill
   ```
2. Whenever a verification run fails, FlowPatch writes the structured run record and NDJSON stream to:
   ```
   data/latest-kane-run.json
   ```
3. Point your coding agent at `data/latest-kane-run.json` and `src/workspace/taskReducer.ts`:
   ```bash
   # Example prompt for Claude Code / Gemini CLI:
   "Read data/latest-kane-run.json, fix the failing step in src/workspace/taskReducer.ts, and run npm run verify to confirm all 4 steps pass."
   ```

---

## Troubleshooting

- **`kane-cli` reports `error: Not authenticated`**:
  - By default, `kane-cli` connects to the TestMu AI cloud controller (`kane-cli login --oauth` or `LT_USERNAME` + `LT_ACCESS_KEY` environment variables).
  - If you are running offline or without a TestMu AI account, FlowPatch displays the exact `kane-cli` output and automatically executes the 4 steps of `flows/task_board_flow_test.md` against `http://localhost:3000` using local headless Chromium so the entire demo works out of the box with zero external account requirements.
- **Custom Chrome / Chromium Path**:
  - Set `KANE_CLI_CHROME_PATH=/path/to/chrome` in your environment if Chrome is installed in a non-standard location.
