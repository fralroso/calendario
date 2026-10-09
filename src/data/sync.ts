// Sincronización: primero se guarda siempre en el dispositivo; cuando hay sesión
// y red, se bajan los cambios nuevos y se suben los pendientes.
// Si dos dispositivos editan lo mismo, gana el cambio más reciente (updatedAt).
import type { Activity } from '../domain/activity';
import { db } from './db';
import { supabase } from './supabase';

interface Row {
  id: string;
  user_id: string;
  title: string;
  category: Activity['category'];
  date: string;
  start_time: string;
  end_time: string | null;
  priority: Activity['priority'];
  location: string;
  notes: string;
  reminder_minutes: number | null;
  status: Activity['status'];
  source: Activity['source'];
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

function toRow(a: Activity, userId: string): Row {
  return {
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
  };
}

function fromRow(r: Row): Activity {
  return {
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
  };
}

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
const lastPullKey = (userId: string) => `calendario:lastPull:${userId}`;

// Al iniciar sesión, lo registrado antes (sin cuenta) pasa a ser de esa cuenta.
async function adoptLocal(userId: string) {
  await db.activities
    .filter((a) => a.userId === 'local')
    .modify({ userId, syncState: 'pending' });
}

async function pull(userId: string) {
  if (!supabase) return;
  let since = Number(localStorage.getItem(lastPullKey(userId)) ?? 0);
  const pageSize = 1000;

  for (let page = 0; page < 20; page++) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .gte('updated_at', since)
      .order('updated_at', { ascending: true })
      .limit(pageSize);
    if (error) throw error;
    const rows = (data ?? []) as Row[];

    for (const r of rows) {
      const remote = fromRow(r);
      const local = await db.activities.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        await db.activities.put(remote);
      }
    }

    if (rows.length > 0) {
      since = Number(rows[rows.length - 1].updated_at);
      localStorage.setItem(lastPullKey(userId), String(since));
    }
    if (rows.length < pageSize) break;
  }
}

async function push(userId: string) {
  if (!supabase) return;
  const pending = await db.activities.where('syncState').equals('pending').toArray();
  if (pending.length === 0) return;

  const { error } = await supabase
    .from('activities')
    .upsert(pending.map((a) => toRow(a, userId)), { onConflict: 'id' });
  if (error) throw error;

  // Se marca como sincronizada solo si no cambió mientras se subía.
  await db.transaction('rw', db.activities, async () => {
    for (const p of pending) {
      const current = await db.activities.get(p.id);
      if (current && current.updatedAt === p.updatedAt) {
        await db.activities.update(p.id, { syncState: 'synced' });
      }
    }
  });
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

    await adoptLocal(user.id);
    await pull(user.id);
    await push(user.id);
    setError(null);
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Error de sincronización');
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
