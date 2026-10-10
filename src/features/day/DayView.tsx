import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listByDate, setStatus } from '../../data/activityRepository';
import type { Activity } from '../../domain/activity';
import { isHoliday } from '../../domain/holidays';
import {
  addDays,
  formatClock,
  formatLongDate,
  nowMinutes,
  toISODate,
  toMinutes,
} from '../../domain/time';
import FabBar from '../../components/FabBar';
import SyncStatus from '../sync/SyncStatus';
import ActivityRow from './ActivityRow';
import { useNow } from './useNow';

interface Props {
  date: string;
  onDateChange: (date: string) => void;
  onBack: () => void;
  onNew: () => void;
  onQuick: () => void;
  onOpen: (activity: Activity) => void;
}

function NowMarker({ time }: { time: string }) {
  return (
    <li className="now" aria-label={`Ahora son las ${time}`}>
      <span className="now__pill">Ahora {time}</span>
      <span className="now__line" aria-hidden="true" />
    </li>
  );
}

export default function DayView({ date, onDateChange, onBack, onNew, onQuick, onOpen }: Props) {
  const now = useNow();
  const today = toISODate(now);
  const items = useLiveQuery(() => listByDate(date), [date]);

  const isToday = date === today;
  const nowMin = nowMinutes(now);
  const { weekday, rest } = formatLongDate(date);

  const pending = items?.filter((a) => a.status === 'pending').length ?? 0;
  const summary =
    items === undefined
      ? ''
      : pending === 0
        ? 'Nada por hacer'
        : pending === 1
          ? '1 actividad por hacer'
          : `${pending} por hacer`;

  const nextId = isToday
    ? items?.find(
        (a) => a.status === 'pending' && toMinutes(a.endTime ?? a.startTime) >= nowMin,
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
        onOpen={() => onOpen(a)}
        onToggle={() => setStatus(a.id, a.status === 'done' ? 'pending' : 'done')}
      />,
    );
  });
  if (isToday && !marked && items && items.length > 0) {
    rows.push(<NowMarker key="now" time={formatClock(now)} />);
  }

  return (
    <main className="app">
      <button type="button" className="back" onClick={onBack}>
        ‹ Semanas
      </button>

      <header className={`head${isHoliday(date) ? ' head--holiday' : ''}`}>
        <div>
          <h1 className="head__weekday">{weekday}</h1>
          <p className="head__rest">{rest}</p>
        </div>
        <nav className="head__nav" aria-label="Cambiar de día">
          <button type="button" className="nav-btn" onClick={() => onDateChange(addDays(date, -1))} aria-label="Día anterior">
            ‹
          </button>
          {!isToday && (
            <button type="button" className="nav-btn nav-btn--text" onClick={() => onDateChange(today)}>
              Hoy
            </button>
          )}
          <button type="button" className="nav-btn" onClick={() => onDateChange(addDays(date, 1))} aria-label="Día siguiente">
            ›
          </button>
        </nav>
      </header>

      <div className="subhead">
        <p className="summary">{summary}</p>
        <SyncStatus />
      </div>

      {items !== undefined && items.length === 0 ? (
        <div className="empty">
          <p className="empty__title">No hay actividades este día.</p>
          <p className="empty__hint">Toca “Nueva actividad” para agregar la primera.</p>
        </div>
      ) : (
        <ul className="list">{rows}</ul>
      )}

      <FabBar onNew={onNew} onQuick={onQuick} />
    </main>
  );
}
