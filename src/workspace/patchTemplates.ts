import type { TaskItem } from '../types/flowpatch';

export const TARGET_REDUCER_PATH = 'src/workspace/taskReducer.ts';

export const HEALTHY_TASK_REDUCER_SOURCE = `import type { TaskItem, TaskPriority } from '../types/flowpatch';

export interface CreateTaskInput {
  title: string;
  category?: string;
  priority?: TaskPriority;
}

/**
 * Pure task creation and list update logic for the FlowPatch Sprint Task Board.
 * This module is loaded directly by the task board API and verified by Kane CLI.
 */
export function createTaskRecord(input: CreateTaskInput, nowIso: string = new Date().toISOString()): TaskItem {
  const cleanTitle = input.title.trim();
  if (!cleanTitle) {
    throw new Error('Task title is required and cannot be empty.');
  }
  return {
    id: \`task-\${Date.now()}-\${Math.random().toString(36).slice(2, 7)}\`,
    title: cleanTitle,
    category: (input.category || 'Verification').trim(),
    priority: input.priority || 'medium',
    completed: false,
    createdAt: nowIso,
  };
}

/**
 * Appends a newly created task item to the active task board state.
 * Working state: prepends newTask to the task board array.
 */
export function applyAddTask(tasks: TaskItem[], newTask: TaskItem): TaskItem[] {
  return [newTask, ...tasks];
}

/**
 * Toggles the completed state of a task by ID.
 */
export function applyToggleTask(tasks: TaskItem[], taskId: string): TaskItem[] {
  return tasks.map((task) =>
    task.id === taskId ? { ...task, completed: !task.completed } : task
  );
}

/**
 * Deletes a task from the board by ID.
 */
export function applyDeleteTask(tasks: TaskItem[], taskId: string): TaskItem[] {
  return tasks.filter((task) => task.id !== taskId);
}
`;

export const REGRESSION_TASK_REDUCER_SOURCE = `import type { TaskItem, TaskPriority } from '../types/flowpatch';

export interface CreateTaskInput {
  title: string;
  category?: string;
  priority?: TaskPriority;
}

/**
 * Pure task creation and list update logic for the FlowPatch Sprint Task Board.
 * This module is loaded directly by the task board API and verified by Kane CLI.
 */
export function createTaskRecord(input: CreateTaskInput, nowIso: string = new Date().toISOString()): TaskItem {
  const cleanTitle = input.title.trim();
  if (!cleanTitle) {
    throw new Error('Task title is required and cannot be empty.');
  }
  return {
    id: \`task-\${Date.now()}-\${Math.random().toString(36).slice(2, 7)}\`,
    title: cleanTitle,
    category: (input.category || 'Verification').trim(),
    priority: input.priority || 'medium',
    completed: false,
    createdAt: nowIso,
  };
}

/**
 * Appends a newly created task item to the active task board state.
 * REGRESSION (FP-104): Stale shallow copy drops newTask during state commit.
 */
export function applyAddTask(tasks: TaskItem[], _newTask: TaskItem): TaskItem[] {
  // Bug introduced during refactor: returns existing list without prepending _newTask
  return [...tasks];
}

/**
 * Toggles the completed state of a task by ID.
 */
export function applyToggleTask(tasks: TaskItem[], taskId: string): TaskItem[] {
  return tasks.map((task) =>
    task.id === taskId ? { ...task, completed: !task.completed } : task
  );
}

/**
 * Deletes a task from the board by ID.
 */
export function applyDeleteTask(tasks: TaskItem[], taskId: string): TaskItem[] {
  return tasks.filter((task) => task.id !== taskId);
}
`;

export const REGRESSION_UNIFIED_DIFF = `--- a/src/workspace/taskReducer.ts
+++ b/src/workspace/taskReducer.ts
@@ -26,7 +26,8 @@
 /**
  * Appends a newly created task item to the active task board state.
- * Working state: prepends newTask to the task board array.
+ * REGRESSION (FP-104): Stale shallow copy drops newTask during state commit.
  */
-export function applyAddTask(tasks: TaskItem[], newTask: TaskItem): TaskItem[] {
-  return [newTask, ...tasks];
+export function applyAddTask(tasks: TaskItem[], _newTask: TaskItem): TaskItem[] {
+  // Bug introduced during refactor: returns existing list without prepending _newTask
+  return [...tasks];
 }`;

export const REPAIR_UNIFIED_DIFF = `--- a/src/workspace/taskReducer.ts
+++ b/src/workspace/taskReducer.ts
@@ -26,8 +26,7 @@
 /**
  * Appends a newly created task item to the active task board state.
- * REGRESSION (FP-104): Stale shallow copy drops newTask during state commit.
+ * Working state: prepends newTask to the task board array.
  */
-export function applyAddTask(tasks: TaskItem[], _newTask: TaskItem): TaskItem[] {
-  // Bug introduced during refactor: returns existing list without prepending _newTask
-  return [...tasks];
+export function applyAddTask(tasks: TaskItem[], newTask: TaskItem): TaskItem[] {
+  return [newTask, ...tasks];
 }`;

export const INITIAL_SEED_TASKS: TaskItem[] = [
  {
    id: 'task-seed-101',
    title: 'Configure Kane CLI testmd flow for task board journey',
    category: 'Kane CLI',
    priority: 'high',
    completed: true,
    createdAt: '2026-11-18T17:45:00.000Z',
  },
  {
    id: 'task-seed-102',
    title: 'Wire NDJSON run record output to local repair engine',
    category: 'Agent Loop',
    priority: 'high',
    completed: false,
    createdAt: '2026-11-18T18:00:00.000Z',
  },
  {
    id: 'task-seed-103',
    title: 'Validate task mutation boundary against empty titles',
    category: 'Safety',
    priority: 'medium',
    completed: false,
    createdAt: '2026-11-18T18:15:00.000Z',
  },
];
