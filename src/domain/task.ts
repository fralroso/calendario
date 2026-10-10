// Pendientes: cosas por hacer durante la semana con una fecha límite, sin hora fija.
import type { Priority, SyncState } from './activity';
import {
  addDays,
  diffDays,
  formatDayMonth,
  parseISODate,
  weekdayLong,
  weekdayShort,
} from './time';

export type TaskStatus = 'pending' | 'done';

export interface Task {
  id: string;
  userId: string;
  title: string;
  dueDate: string; // fecha límite YYYY-MM-DD
  priority: Priority;
  notes: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  syncState: SyncState;
}

export type TaskDraft = Pick<Task, 'title' | 'dueDate' | 'priority' | 'notes' | 'status'>;

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'done', label: 'Hecho' },
];

export type Bucket = 'overdue' | 'today' | 'week' | 'later';

export const BUCKETS: Bucket[] = ['overdue', 'today', 'week', 'later'];

export const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: 'Vencidos',
  today: 'Para hoy',
  week: 'Próximos 7 días',
  later: 'Más adelante',
};

export function bucketOf(dueDate: string, today: string): Bucket {
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';
  if (dueDate <= addDays(today, 7)) return 'week';
  return 'later';
}

const upperFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function dueLabel(dueDate: string, today: string): string {
  const n = diffDays(today, dueDate);
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Mañana';
  if (n === -1) return 'Venció ayer';
  if (n < -1) return `Venció hace ${-n} días`;
  if (n <= 6) return upperFirst(weekdayLong(dueDate));
  return `${weekdayShort(dueDate)} ${formatDayMonth(dueDate)}`;
}

const RANK: Record<Priority, number> = { none: 0, green: 1, yellow: 2, red: 3 };

// Primero lo que vence antes; a igual fecha, lo más importante.
export function sortTasks(a: Task, b: Task): number {
  return (
    a.dueDate.localeCompare(b.dueDate) ||
    RANK[b.priority] - RANK[a.priority] ||
    a.createdAt - b.createdAt
  );
}

// Fecha límite sugerida: el viernes de esta semana (o el próximo si ya pasó).
export function defaultDue(today: string): string {
  const dow = (parseISODate(today).getDay() + 6) % 7; // lunes = 0
  return addDays(today, dow <= 4 ? 4 - dow : 11 - dow);
}
