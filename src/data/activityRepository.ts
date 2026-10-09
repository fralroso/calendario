// Único punto de acceso a los datos. La pantalla nunca toca la base directamente,
// así que más adelante se agrega la sincronización con Supabase sin tocar la interfaz.
import { db } from './db';
import type { Activity, ActivityDraft, Status } from '../domain/activity';
import { toMinutes } from '../domain/time';

export const LOCAL_USER_ID = 'local';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function listByDate(date: string): Promise<Activity[]> {
  const rows = await db.activities.where('date').equals(date).toArray();
  return rows
    .filter((a) => a.deletedAt === null)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

export async function saveActivity(draft: ActivityDraft, id?: string): Promise<Activity> {
  const now = Date.now();
  const prev = id ? await db.activities.get(id) : undefined;
  const activity: Activity = {
    ...draft,
    id: prev?.id ?? newId(),
    userId: prev?.userId ?? LOCAL_USER_ID,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
    syncState: 'pending',
  };
  await db.activities.put(activity);
  return activity;
}

export async function setStatus(id: string, status: Status): Promise<void> {
  await db.activities.update(id, { status, updatedAt: Date.now(), syncState: 'pending' });
}

export async function removeActivity(id: string): Promise<void> {
  const now = Date.now();
  await db.activities.update(id, { deletedAt: now, updatedAt: now, syncState: 'pending' });
}
