import type { TaskItem, TaskPriority } from '../types/flowpatch';

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
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
