import { db } from './db';
import { LOCAL_USER_ID } from './activityRepository';
import { requestSync } from './sync';
import type { Task, TaskDraft, TaskStatus } from '../domain/task';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function listTasks(): Promise<Task[]> {
  const rows = await db.tasks.toArray();
  return rows.filter((t) => t.deletedAt === null);
}

// Pendientes vencidos o que vencen hoy (para el aviso en la pestaña).
export async function countUrgent(today: string): Promise<number> {
  return db.tasks
    .where('dueDate')
    .belowOrEqual(today)
    .filter((t) => t.status === 'pending' && t.deletedAt === null)
    .count();
}

export async function saveTask(draft: TaskDraft, id?: string): Promise<Task> {
  const now = Date.now();
  const prev = id ? await db.tasks.get(id) : undefined;
  const task: Task = {
    ...draft,
    id: prev?.id ?? newId(),
    userId: prev?.userId ?? LOCAL_USER_ID,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
    syncState: 'pending',
  };
  await db.tasks.put(task);
  requestSync();
  return task;
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<void> {
  await db.tasks.update(id, { status, updatedAt: Date.now(), syncState: 'pending' });
  requestSync();
}

export async function removeTask(id: string): Promise<void> {
  const now = Date.now();
  await db.tasks.update(id, { deletedAt: now, updatedAt: now, syncState: 'pending' });
  requestSync();
}
