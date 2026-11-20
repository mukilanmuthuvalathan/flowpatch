# FlowPatch — Three-Minute Judge Demo Script

**Total Runtime:** ~3 minutes  
**Command to Launch:** `npm run dev` (runs at `http://localhost:3000`)

---

### 0:00 – 0:35 | 1. Introduction & Working Baseline
- **On Screen:** Open FlowPatch at `http://localhost:3000`. Highlight the header motto: *"Make a change. Let Kane check the flow. Fix what breaks."* and the **Local demo** indicator.
- **Action:** In the **Sprint Task Board** (left column), type `"Verify release checklist"` into **New Task Title** and click **Add Task**. Click its check circle to mark it **Completed**.
- **Narration:** *"FlowPatch demonstrates how Kane CLI and a coding agent work together in a closed verification loop. Here is our application under test: a real Sprint Task Board backed by `src/workspace/taskReducer.ts`. In the initial healthy state, adding and completing tasks works as expected."*

---

### 0:35 – 1:10 | 2. Passing Kane CLI Verification (Run #1)
- **Action:** Click **Run Kane verification** in the top bar (or run `npm run verify` in the terminal).
- **On Screen:** Show the **Browser Flow Verification** panel on the right updating to **Run #1: PASSED — All 4 browser flow steps verified**, with step timings and live DOM observations for Steps 01 through 04 (`flows/task_board_flow_test.md`).
- **Narration:** *"Before making a code change, we click 'Run Kane verification'. FlowPatch invokes Kane CLI against `flows/task_board_flow_test.md`, exercising the real four-step browser journey in headless Chromium: loading the board, creating a task, marking it complete, and deleting it. Run #1 passes all four steps."*

---

### 1:10 – 1:55 | 3. Simulate Regression & Catch the Bug with Kane (Run #2)
- **Action:** Click **Simulate regression**.
- **On Screen:** Point to the **Source State: Regression Active (FP-104)** indicator and the **Unified Diff** in the lower-left panel showing `applyAddTask` in `src/workspace/taskReducer.ts` modified on disk to `return [...tasks];`.
- **Action:** Click **Run Kane verification** again.
- **On Screen:** Show **Run #2: FAILED — Step 2 failed verification** in the Verification Panel. Highlight Step 2 (`02. Create a New Task Item`) showing the exact DOM failure: `Clicked "Add Task" with title "Verify Kane flow regression check", but live DOM [data-testid="task-list"] contains 0 matching items`.
- **Narration:** *"Now we click 'Simulate regression', which injects a real bug into `src/workspace/taskReducer.ts` on disk so `applyAddTask` returns a stale shallow copy instead of prepending the new task. When we run Kane verification again, Run #2 fails at Step 2 ('Create a New Task Item') and saves the structured failure evidence to `data/latest-kane-run.json`."*

---

### 1:55 – 2:35 | 4. Agent Feedback Loop & Code Repair
- **Action:** Click **Let agent repair**.
- **On Screen:** Show the **Failure-to-Patch Repair Loop** panel updating with the **Latest Patch Applied by Local Demo Agent (Deterministic Code Repair)** card, citing **Run #2 (Step 2: Create a New Task Item)** and displaying the unified repair diff that restores `return [newTask, ...tasks];`.
- **Narration:** *"Next, we click 'Let agent repair'. Honestly labeled as our Local Demo Agent so judges can run this offline without API keys, the repair engine reads `data/latest-kane-run.json`, traces Step 2's failure to `applyAddTask` in `src/workspace/taskReducer.ts`, and patches the TypeScript file on disk."*

---

### 2:35 – 3:00 | 5. Passing Rerun Proof (Run #3) & Reset
- **Action:** Click **Run Kane verification** one final time.
- **On Screen:** Show **Run #3: PASSED — All 4 browser flow steps verified** and scroll to **Verification & Repair Run History**, showing the complete chronological audit trail: Run #1 Passed -> Regression Injected -> Run #2 Failed at Step 2 -> Repaired `src/workspace/taskReducer.ts` -> Run #3 Passed.
- **Action:** Click **Reset** to restore the clean initial state.
- **Narration:** *"Finally, we run Kane verification once more. Run #3 passes all four browser steps, proving the repair resolved the regression end to end. Everything is logged in the Run History timeline and can be reset with one click."*
