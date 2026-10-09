import { useEffect, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listByDate, setStatus } from '../../data/activityRepository';
import type { Activity } from '../../domain/activity';
import {
  addDays,
  formatClock,
  formatLongDate,
  nowMinutes,
  toISODate,
  toMinutes,
} from '../../domain/time';
import ActivityForm from '../activity/ActivityForm';
import ActivityRow from './ActivityRow';

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function NowMarker({ time }: { time: string }) {
  return (
    <li className="now" aria-label={`Ahora son las ${time}`}>
      <span className="now__pill">Ahora {time}</span>
      <span className="now__line" aria-hidden="true" />
    </li>
  );
}

export default function DayView() {
  const now = useNow();
  const today = toISODate(now);
  const [date, setDate] = useState(today);
  const [sheet, setSheet] = useState<Activity | 'new' | null>(null);

  const items = useLiveQuery(() => listByDate(date), [date]);

  const isToday = date === today;
  const nowMin = nowMinutes(now);
  const { weekday, rest } = formatLongDate(date);

  const pending = items?.filter((a) => a.status === 'pending').length ?? 0;
  const summary =
    items === undefined
      ? ''
      : pending === 0
        ? 'Nada pendiente'
        : pending === 1
          ? '1 pendiente'
          : `${pending} pendientes`;

  const nextId = isToday
    ? items?.find(
        (a) =>
          a.status === 'pending' &&
          toMinutes(a.endTime ?? a.startTime) >= nowMin,
      )?.id
    : undefined;

  const rows: ReactNode[] = [];
  let marked = false;
  (items ?? []).forEach((a) => {
    if (isToday && !marked && toMinutes(a.startTime) > nowMin) {
      rows.push(<NowMarker key="now" time={formatClock(now)} />);
      marked = true;
    }
    rows.push(
      <ActivityRow
        key={a.id}
        activity={a}
        isNext={a.id === nextId}
        onOpen={() => setSheet(a)}
        onToggle={() => setStatus(a.id, a.status === 'done' ? 'pending' : 'done')}
      />,
    );
  });
  if (isToday && !marked && items && items.length > 0) {
    rows.push(<NowMarker key="now" time={formatClock(now)} />);
  }

  return (
    <main className="app">
      <header className="head">
        <div>
          <h1 className="head__weekday">{weekday}</h1>
          <p className="head__rest">{rest}</p>
        </div>
        <nav className="head__nav" aria-label="Cambiar de día">
          <button type="button" className="nav-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">
            ‹
          </button>
          {!isToday && (
            <button type="button" className="nav-btn nav-btn--text" onClick={() => setDate(today)}>
              Hoy
            </button>
          )}
          <button type="button" className="nav-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente">
            ›
          </button>
        </nav>
      </header>

      <p className="summary">{summary}</p>

      {items !== undefined && items.length === 0 ? (
        <div className="empty">
          <p className="empty__title">No hay actividades este día.</p>
          <p className="empty__hint">Toca “Nueva actividad” para agregar la primera.</p>
        </div>
      ) : (
        <ul className="list">{rows}</ul>
      )}

      <div className="fab-wrap">
        <button type="button" className="fab" onClick={() => setSheet('new')}>
          + Nueva actividad
        </button>
      </div>

      {sheet !== null && (
        <ActivityForm
          initial={sheet === 'new' ? null : sheet}
          defaultDate={date}
          onClose={() => setSheet(null)}
        />
      )}
    </main>
  );
}
