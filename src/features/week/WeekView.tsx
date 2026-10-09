import { useLiveQuery } from 'dexie-react-hooks';
import { listRange } from '../../data/activityRepository';
import type { Activity } from '../../domain/activity';
import {
  addDays,
  dayOfMonth,
  formatDayMonth,
  formatLongDate,
  startOfWeek,
  toISODate,
  weekdayShort,
} from '../../domain/time';
import SyncStatus from '../sync/SyncStatus';
import { useNow } from '../day/useNow';

interface Props {
  weekStart: string;
  onWeekStartChange: (weekStart: string) => void;
  onOpenDay: (date: string) => void;
  onNew: () => void;
  onLogin: () => void;
}

const MAX_ITEMS = 3;

function DayRow({
  date,
  items,
  today,
  onOpen,
}: {
  date: string;
  items: Activity[];
  today: string;
  onOpen: () => void;
}) {
  const isToday = date === today;
  const isPast = date < today;
  const shown = items.slice(0, MAX_ITEMS);
  const more = items.length - shown.length;

  return (
    <li>
      <button
        type="button"
        className={`wk__row${isToday ? ' wk__row--today' : ''}${isPast ? ' wk__row--past' : ''}`}
        onClick={onOpen}
        aria-label={`${weekdayShort(date)} ${dayOfMonth(date)}: ${
          items.length === 0 ? 'libre' : `${items.length} actividades`
        }`}
      >
        <span className="wk__date">
          <span className="wk__wd">{weekdayShort(date)}</span>
          <span className="wk__num">{dayOfMonth(date)}</span>
        </span>

        {items.length === 0 ? (
          <span className="wk__free">Libre</span>
        ) : (
          <span className="wk__items">
            {shown.map((a) => (
              <span key={a.id} className={`wk__item${a.status === 'done' ? ' is-done' : ''}`}>
                <span className={`dot dot--${a.priority}`} aria-hidden="true" />
                <span className="wk__time">{a.startTime}</span>
                <span className="wk__title">{a.title}</span>
              </span>
            ))}
            {more > 0 && <span className="wk__more">+{more} más</span>}
          </span>
        )}

        <span className="wk__chev" aria-hidden="true">
          ›
        </span>
      </button>
    </li>
  );
}

export default function WeekView({ weekStart, onWeekStartChange, onOpenDay, onNew, onLogin }: Props) {
  const now = useNow();
  const today = toISODate(now);
  const thisWeek = startOfWeek(today);
  const items = useLiveQuery(() => listRange(weekStart, addDays(weekStart, 13)), [weekStart]);

  const byDate = new Map<string, Activity[]>();
  (items ?? []).forEach((a) => {
    if (a.status === 'cancelled') return;
    const list = byDate.get(a.date);
    if (list) list.push(a);
    else byDate.set(a.date, [a]);
  });

  const { weekday, rest } = formatLongDate(today);
  const todayPending = (byDate.get(today) ?? []).filter((a) => a.status === 'pending').length;
  const todayInRange = today >= weekStart && today <= addDays(weekStart, 13);
  const summary =
    !todayInRange || items === undefined
      ? ''
      : todayPending === 0
        ? 'Hoy: nada pendiente'
        : todayPending === 1
          ? 'Hoy: 1 pendiente'
          : `Hoy: ${todayPending} pendientes`;

  function weekTitle(start: string): string {
    if (start === thisWeek) return 'Esta semana';
    if (start === addDays(thisWeek, 7)) return 'Próxima semana';
    if (start === addDays(thisWeek, -7)) return 'Semana pasada';
    return `Semana del ${formatDayMonth(start)}`;
  }

  const weeks = [weekStart, addDays(weekStart, 7)];

  return (
    <main className="app">
      <header className="head">
        <div>
          <h1 className="head__weekday head__weekday--week">Mi agenda</h1>
          <p className="head__rest">
            <span className="cap">{weekday}</span> {rest}
          </p>
        </div>
        <nav className="head__nav" aria-label="Cambiar de semana">
          <button type="button" className="nav-btn" onClick={() => onWeekStartChange(addDays(weekStart, -7))} aria-label="Semana anterior">
            ‹
          </button>
          {weekStart !== thisWeek && (
            <button type="button" className="nav-btn nav-btn--text" onClick={() => onWeekStartChange(thisWeek)}>
              Hoy
            </button>
          )}
          <button type="button" className="nav-btn" onClick={() => onWeekStartChange(addDays(weekStart, 7))} aria-label="Semana siguiente">
            ›
          </button>
        </nav>
      </header>

      <div className="subhead">
        <p className="summary">{summary}</p>
        <SyncStatus onLogin={onLogin} />
      </div>

      {weeks.map((start) => (
        <section key={start} className="wk">
          <h2 className="wk__title-week">
            {weekTitle(start)}
            <span className="wk__range">
              {formatDayMonth(start)} al {formatDayMonth(addDays(start, 6))}
            </span>
          </h2>
          <ul className="wk__list">
            {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((date) => (
              <DayRow
                key={date}
                date={date}
                items={byDate.get(date) ?? []}
                today={today}
                onOpen={() => onOpenDay(date)}
              />
            ))}
          </ul>
        </section>
      ))}

      <div className="fab-wrap">
        <button type="button" className="fab" onClick={onNew}>
          + Nueva actividad
        </button>
      </div>
    </main>
  );
}
