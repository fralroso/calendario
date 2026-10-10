// Sincronización: primero se guarda siempre en el dispositivo; cuando hay sesión
// y red, se bajan los cambios nuevos y se suben los pendientes.
// Si dos dispositivos editan lo mismo, gana el cambio más reciente (updatedAt).
import type { Table } from 'dexie';
import type { Activity, SyncState } from '../domain/activity';
import type { Task } from '../domain/task';
import { db } from './db';
import { supabase } from './supabase';

interface Syncable {
  id: string;
  userId: string;
  updatedAt: number;
  syncState: SyncState;
}

interface Spec<T extends Syncable> {
  name: 'activities' | 'tasks'; // nombre de la tabla en Supabase
  table: Table<T, string>;
  toRow: (item: T, userId: string) => Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fromRow: (row: any) => T;
}

const activitySpec: Spec<Activity> = {
  name: 'activities',
  table: db.activities,
  toRow: (a, userId) => ({
    id: a.id,
    user_id: userId,
    title: a.title,
    category: a.category,
    date: a.date,
    start_time: a.startTime,
    end_time: a.endTime,
    priority: a.priority,
    location: a.location,
    notes: a.notes,
    reminder_minutes: a.reminderMinutes,
    status: a.status,
    source: a.source,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
    deleted_at: a.deletedAt,
  }),
  fromRow: (r) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    category: r.category ?? 'other',
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    priority: r.priority,
    location: r.location,
    notes: r.notes,
    reminderMinutes: r.reminder_minutes,
    status: r.status,
    source: r.source,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
    deletedAt: r.deleted_at === null ? null : Number(r.deleted_at),
    syncState: 'synced',
  }),
};

const taskSpec: Spec<Task> = {
  name: 'tasks',
  table: db.tasks,
  toRow: (t, userId) => ({
    id: t.id,
    user_id: userId,
    title: t.title,
    due_date: t.dueDate,
    priority: t.priority,
    notes: t.notes,
    status: t.status,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    deleted_at: t.deletedAt,
  }),
  fromRow: (r) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    dueDate: r.due_date,
    priority: r.priority,
    notes: r.notes,
    status: r.status,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
    deletedAt: r.deleted_at === null ? null : Number(r.deleted_at),
    syncState: 'synced',
  }),
};

// ---- Estado de error visible en pantalla ----
let lastError: string | null = null;
const listeners = new Set<() => void>();

function setError(message: string | null) {
  if (message !== lastError) {
    lastError = message;
    listeners.forEach((l) => l());
  }
}

export const syncErrorStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => lastError,
};

// ---- Pasos de la sincronización ----
// La clave de las actividades no cambia, para no volver a bajar todo.
const pullKey = (name: string, userId: string) =>
  name === 'activities' ? `calendario:lastPull:${userId}` : `calendario:lastPull:${name}:${userId}`;

// Al iniciar sesión, lo registrado antes (sin cuenta) pasa a ser de esa cuenta.
async function adoptLocal<T extends Syncable>(spec: Spec<T>, userId: string) {
  await spec.table
    .filter((a) => a.userId === 'local')
    .modify({ userId, syncState: 'pending' } as never);
}

async function pull<T extends Syncable>(spec: Spec<T>, userId: string) {
  if (!supabase) return;
  const key = pullKey(spec.name, userId);
  let since = Number(localStorage.getItem(key) ?? 0);
  const pageSize = 1000;

  for (let page = 0; page < 20; page++) {
    const { data, error } = await supabase
      .from(spec.name)
      .select('*')
      .gte('updated_at', since)
      .order('updated_at', { ascending: true })
      .limit(pageSize);
    if (error) throw error;
    const rows = (data ?? []) as Array<Record<string, unknown>>;

    for (const r of rows) {
      const remote = spec.fromRow(r);
      const local = await spec.table.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        await spec.table.put(remote);
      }
    }

    if (rows.length > 0) {
      since = Number(rows[rows.length - 1].updated_at);
      localStorage.setItem(key, String(since));
    }
    if (rows.length < pageSize) break;
  }
}

async function push<T extends Syncable>(spec: Spec<T>, userId: string) {
  if (!supabase) return;
  const pending = await spec.table.where('syncState').equals('pending').toArray();
  if (pending.length === 0) return;

  const { error } = await supabase
    .from(spec.name)
    .upsert(pending.map((item) => spec.toRow(item, userId)), { onConflict: 'id' });
  if (error) throw error;

  // Se marca como sincronizada solo si no cambió mientras se subía.
  await db.transaction('rw', spec.table, async () => {
    for (const p of pending) {
      const current = await spec.table.get(p.id);
      if (current && current.updatedAt === p.updatedAt) {
        await spec.table.update(p.id, { syncState: 'synced' } as never);
      }
    }
  });
}

async function syncTable<T extends Syncable>(spec: Spec<T>, userId: string) {
  await adoptLocal(spec, userId);
  await pull(spec, userId);
  await push(spec, userId);
}

function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Error de sincronización';
}

let running = false;
let rerun = false;

export async function syncNow(): Promise<void> {
  if (!supabase) return;
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  try {
    if (!navigator.onLine) return;
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return;

    // Cada tabla se sincroniza por separado: si una falla, la otra sigue.
    const errors: string[] = [];
    try {
      await syncTable(activitySpec, user.id);
    } catch (e) {
      errors.push(errorMessage(e));
    }
    try {
      await syncTable(taskSpec, user.id);
    } catch (e) {
      errors.push(errorMessage(e));
    }
    setError(errors.length > 0 ? errors[0] : null);
  } catch (e) {
    setError(errorMessage(e));
  } finally {
    running = false;
    if (rerun) {
      rerun = false;
      requestSync();
    }
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;

// Pide una sincronización en breve (agrupa varios cambios seguidos en una sola).
export function requestSync(delayMs = 1500) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    void syncNow();
  }, delayMs);
}

// Se llama una vez al abrir la app. Devuelve la función para detenerlo todo.
export function startSync(): () => void {
  if (!supabase) return () => {};

  const onOnline = () => requestSync(300);
  window.addEventListener('online', onOnline);
  const interval = setInterval(() => requestSync(0), 60_000);
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') requestSync(0);
  });
  requestSync(0);

  return () => {
    window.removeEventListener('online', onOnline);
    clearInterval(interval);
    data.subscription.unsubscribe();
  };
}
