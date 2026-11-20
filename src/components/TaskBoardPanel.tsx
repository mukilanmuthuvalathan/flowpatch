import React, { useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { CodePatchState, TaskItem, TaskPriority } from '../types/flowpatch';

interface TaskBoardPanelProps {
  tasks: TaskItem[];
  codeState: CodePatchState;
  isMutating: boolean;
  onAddTask: (input: {
    title: string;
    category: string;
    priority: TaskPriority;
  }) => Promise<{ addedToBoard: boolean; error?: string }>;
  onToggleTask: (taskId: string) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

export const TaskBoardPanel: React.FC<TaskBoardPanelProps> = ({
  tasks,
  codeState,
  isMutating,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Verification');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [droppedTaskNotice, setDroppedTaskNotice] = useState<string | null>(null);

  const completedCount = tasks.filter((t) => t.completed).length;
  const activeCount = tasks.length - completedCount;

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setDroppedTaskNotice(null);

    const trimmed = title.trim();
    if (!trimmed) {
      setValidationError('Enter a non-empty task title before clicking Add Task.');
      return;
    }

    const result = await onAddTask({
      title: trimmed,
      category,
      priority,
    });

    if (result.error) {
      setValidationError(result.error);
      return;
    }

    setTitle('');
    if (!result.addedToBoard) {
      setDroppedTaskNotice(
        `Submitted "${trimmed}", but applyAddTask() in src/workspace/taskReducer.ts returned the unchanged array (${tasks.length} items). Run Kane verification to catch this regression.`
      );
    }
  };

  return (
    <section
      data-testid="task-board-workspace"
      aria-labelledby="task-board-heading"
      className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mb-1">
            <span>Application Under Test</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">src/workspace/taskReducer.ts</span>
            <span aria-hidden="true">·</span>
            <span
              data-testid="reducer-code-state"
              className={
                codeState === 'regression_injected'
                  ? 'text-amber-400 font-medium'
                  : 'text-emerald-400 font-medium'
              }
            >
              {codeState === 'regression_injected'
                ? 'Source State: Regression Active (FP-104)'
                : codeState === 'repaired'
                ? 'Source State: Repaired by Local Demo Agent'
                : 'Source State: Healthy Working Code'}
            </span>
          </div>
          <h2 id="task-board-heading" className="text-lg font-semibold text-slate-100">
            Sprint Task Board
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 tabular-nums">
          <span data-testid="total-tasks-count">{tasks.length} total</span>
          <span aria-hidden="true">·</span>
          <span data-testid="active-tasks-count">{activeCount} active</span>
          <span aria-hidden="true">·</span>
          <span data-testid="completed-tasks-count">{completedCount} completed</span>
        </div>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6">
            <label htmlFor="new-task-input" className="block text-xs font-medium text-slate-300 mb-1.5">
              New Task Title
            </label>
            <input
              id="new-task-input"
              data-testid="new-task-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. Verify webhook signature handling"
              className="w-full h-10 px-3.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/30"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="new-task-category" className="block text-xs font-medium text-slate-300 mb-1.5">
              Workstream
            </label>
            <select
              id="new-task-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/30"
            >
              <option value="Verification">Verification</option>
              <option value="Kane CLI">Kane CLI</option>
              <option value="Agent Loop">Agent Loop</option>
              <option value="Safety">Safety</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="new-task-priority" className="block text-xs font-medium text-slate-300 mb-1.5">
              Priority
            </label>
            <select
              id="new-task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full h-10 px-3 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/30"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Interactive Filter Controls */}
          <div
            role="group"
            aria-label="Filter tasks by status"
            className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg"
          >
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === 'all'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === 'active'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === 'completed'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          <button
            type="submit"
            data-testid="add-task-button"
            disabled={isMutating}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>

        {validationError && (
          <p
            role="alert"
            data-testid="task-validation-error"
            className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-lg px-3 py-2"
          >
            {validationError}
          </p>
        )}

        {droppedTaskNotice && (
          <div
            role="status"
            data-testid="regression-drop-notice"
            className="flex items-start gap-2.5 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-lg px-3.5 py-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{droppedTaskNotice}</span>
          </div>
        )}
      </form>

      {/* Task List */}
      <div data-testid="task-list" className="divide-y divide-slate-800/80 border-t border-slate-800">
        {filteredTasks.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No tasks match the selected filter. Add a task above or switch filters.
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              data-testid="task-item"
              className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/20 px-2 -mx-2 rounded-lg transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  type="button"
                  data-testid="toggle-task-button"
                  onClick={() => onToggleTask(task.id)}
                  aria-label={
                    task.completed
                      ? `Mark "${task.title}" active`
                      : `Mark "${task.title}" complete`
                  }
                  className="mt-0.5 text-slate-400 hover:text-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded cursor-pointer shrink-0"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium break-words ${
                      task.completed ? 'line-through text-slate-500' : 'text-slate-100'
                    }`}
                  >
                    {task.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                    <span>{task.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>Priority: {task.priority}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      data-testid="task-status-label"
                      className={task.completed ? 'text-emerald-400' : 'text-sky-400'}
                    >
                      {task.completed ? 'Completed' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-testid="delete-task-button"
                onClick={() => onDeleteTask(task.id)}
                aria-label={`Delete task "${task.title}"`}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
