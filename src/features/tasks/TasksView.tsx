import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listTasks, setTaskStatus } from '../../data/taskRepository';
import { PRIORITY_LABEL } from '../../domain/activity';
import {
  BUCKETS,
  BUCKET_LABEL,
  bucketOf,
  dueLabel,
  sortTasks,
  type Bucket,
  type Task,
} from '../../domain/task';
import { toISODate } from '../../domain/time';
import { useNow } from '../day/useNow';
import SyncStatus from '../sync/SyncStatus';

interface Props {
  tabs: ReactNode;
  onNew: () => void;
  onOpen: (task: Task) => void;
}

function TaskRow({ task, today, onOpen }: { task: Task; today: string; onOpen: () => void }) {
  const done = task.status === 'done';
  const bucket = bucketOf(task.dueDate, today);
  return (
    <li className={`trow${done ? ' trow--done' : ''}`}>
      <button
        type="button"
        className={`check${done ? ' is-on' : ''}`}
        aria-pressed={done}
        aria-label={done ? 'Marcar como pendiente' : 'Marcar como hecho'}
        onClick={() => setTaskStatus(task.id, done ? 'pending' : 'done')}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button type="button" className="row__body" onClick={onOpen}>
        <span className={`bar bar--${task.priority}`} aria-hidden="true" />
        <span className="row__text">
          <span className={`row__title${done ? ' is-done' : ''}`}>{task.title}</span>
          <span className="row__meta">
            <span className={`due${done ? '' : ` due--${bucket}`}`}>{dueLabel(task.dueDate, today)}</span>
            {task.priority !== 'none' && <span>{PRIORITY_LABEL[task.priority]}</span>}
          </span>
        </span>
      </button>
    </li>
  );
}

export default function TasksView({ tabs, onNew, onOpen }: Props) {
  const now = useNow();
  const today = toISODate(now);
  const tasks = useLiveQuery(() => listTasks(), []);
  const [showDone, setShowDone] = useState(false);

  const pending = (tasks ?? []).filter((t) => t.status === 'pending').sort(sortTasks);
  const done = (tasks ?? [])
    .filter((t) => t.status === 'done')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 30);

  const groups: Record<Bucket, Task[]> = { overdue: [], today: [], week: [], later: [] };
  pending.forEach((t) => groups[bucketOf(t.dueDate, today)].push(t));

  const summary =
    tasks === undefined
      ? ''
      : pending.length === 0
        ? 'Sin pendientes'
        : pending.length === 1
          ? '1 por hacer'
          : `${pending.length} por hacer`;

  return (
    <main className="app">
      {tabs}

      <header className="head">
        <div>
          <h1 className="head__weekday head__weekday--week">Pendientes</h1>
          <p className="head__rest">Tareas con fecha límite, sin hora fija</p>
        </div>
      </header>

      <div className="subhead">
        <p className="summary">{summary}</p>
        <SyncStatus />
      </div>

      {tasks !== undefined && pending.length === 0 && (
        <div className="empty">
          <p className="empty__title">No tienes pendientes.</p>
          <p className="empty__hint">Toca “Nuevo pendiente” para agregar uno.</p>
        </div>
      )}

      {BUCKETS.map((b) =>
        groups[b].length === 0 ? null : (
          <section key={b} className="tsec">
            <h2 className={`tsec__title tsec__title--${b}`}>
              {BUCKET_LABEL[b]} <span className="tsec__count">{groups[b].length}</span>
            </h2>
            <ul className="tlist">
              {groups[b].map((t) => (
                <TaskRow key={t.id} task={t} today={today} onOpen={() => onOpen(t)} />
              ))}
            </ul>
          </section>
        ),
      )}

      {done.length > 0 && (
        <section className="tsec">
          <button type="button" className="showdone" onClick={() => setShowDone(!showDone)}>
            {showDone ? 'Ocultar hechos' : `Ver hechos (${done.length})`}
          </button>
          {showDone && (
            <ul className="tlist">
              {done.map((t) => (
                <TaskRow key={t.id} task={t} today={today} onOpen={() => onOpen(t)} />
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="fab-wrap">
        <div className="fab-row">
          <button type="button" className="fab" onClick={onNew}>
            + Nuevo pendiente
          </button>
        </div>
      </div>
    </main>
  );
}
