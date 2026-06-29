/**
 * Execution state — reads/writes execution/tasks.json
 * Tracks active tasks, completed work, and agent assignments.
 */

import fs from 'fs';
import path from 'path';

const TASKS_FILE = path.resolve(process.cwd(), 'execution/tasks.json');

interface TaskEntry {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deferred';
  priority: 'high' | 'medium' | 'low';
  description: string;
  assigned_to?: string;
  spec?: string | null;
  started_at?: string;
  completed_at?: string;
}

interface TaskState {
  version: string;
  project: string;
  updated: string;
  active_tasks: TaskEntry[];
  completed_tasks: string[];
}

function loadTasks(): TaskState {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
    }
  } catch {}
  return { version: '1.0', project: 'salespilot', updated: new Date().toISOString().slice(0, 10), active_tasks: [], completed_tasks: [] };
}

function saveTasks(state: TaskState): void {
  try {
    state.updated = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(TASKS_FILE, JSON.stringify(state, null, 2));
  } catch {}
}

/** Get all active tasks */
export function getActiveTasks(): TaskEntry[] {
  return loadTasks().active_tasks;
}

/** Get completed task titles */
export function getCompletedTasks(): string[] {
  return loadTasks().completed_tasks;
}

/** Add a new task */
export function addTask(task: Omit<TaskEntry, 'id'>): TaskEntry {
  const state = loadTasks();
  const id = `T${String(state.active_tasks.length + state.completed_tasks.length + 1).padStart(3, '0')}`;
  const entry = { ...task, id };
  state.active_tasks.push(entry);
  saveTasks(state);
  return entry;
}

/** Update task status */
export function updateTask(id: string, updates: Partial<TaskEntry>): void {
  const state = loadTasks();
  const task = state.active_tasks.find(t => t.id === id);
  if (!task) return;
  Object.assign(task, updates);
  if (updates.status === 'completed') {
    state.completed_tasks.push(task.title);
    state.active_tasks = state.active_tasks.filter(t => t.id !== id);
    task.completed_at = new Date().toISOString();
  }
  saveTasks(state);
}

/** Get task summary for AI context */
export function getTaskSummary(): string {
  const state = loadTasks();
  const active = state.active_tasks;
  const completed = state.completed_tasks;
  return `Active tasks: ${active.length} (${active.filter(t => t.priority === 'high').length} high priority). Completed: ${completed.length}. ${active.map(t => `${t.id}: ${t.title} [${t.status}]`).join(', ')}`;
}
