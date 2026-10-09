import { useRef, type CSSProperties, type TouchEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listRange } from '../../data/activityRepository';
import type { Activity } from '../../domain/activity';
import { isHoliday } from '../../domain/holidays';
import { layoutDay } from '../../domain/layout';
import {
  addDays,
  dayOfMonth,
  formatDayMonth,
  formatLongDate,
  nowMinutes,
  pad,
  startOfWeek,
  toISODate,
  toMinutes,
  weekdayShort,
} from '../../domain/time';
import SyncStatus from '../sync/SyncStatus';
import { useNow } from '../day/useNow';

interface Props {
  weekStart: string;
  onWeekStartChange: (weekStart: string) => void;
  onOpenDay: (date: string) => void;
  onNew: () => void;
}

// Deslizar el dedo hacia la izquierda lleva a la semana pasada, hacia la derecha a la siguiente.
// Si se siente al revés, basta con cambiar este valor a false.
const SWIPE_LEFT_IS_PREVIOUS = true;
const BAR_HEIGHT = 360; // px

export default function WeekView({ weekStart, onWeekStartChange, onOpenDay, onNew }: Props) {
  const now = useNow();
  const today = toISODate(now);
  const thisWeek = startOfWeek(today);
  const items = useLiveQuery(() => listRange(weekStart, addDays(weekStart, 6)), [weekStart]);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const byDate = new Map<string, Activity[]>();
  (items ?? []).forEach((a) => {
    if (a.status === 'cancelled') return;
    const list = byDate.get(a.date);
    if (list) list.push(a);
    else byDate.set(a.date, [a]);
  });

  // Rango de horas visible: de 06:00 a 22:00, y se amplía si hay algo fuera de ese horario.
  let minH = 6;
  let maxH = 22;
  (items ?? []).forEach((a) => {
    if (a.status === 'cancelled') return;
    const s = toMinutes(a.startTime);
    const e = a.endTime ? toMinutes(a.endTime) : s + 60;
    minH = Math.min(minH, Math.floor(s / 60));
    maxH = Math.max(maxH, Math.ceil(Math.min(e, 24 * 60) / 60));
  });
  if (minH % 2 === 1) minH -= 1;
  if (maxH % 2 === 1) maxH += 1;
  maxH = Math.min(maxH, 24);
  const rangeStart = minH * 60;
  const rangeEnd = maxH * 60;
  const nowMin = nowMinutes(now);

  const ticks: number[] = [];
  for (let h = minH; h <= maxH; h += 4) ticks.push(h);

  const { weekday, rest } = formatLongDate(today);
  const todayPending = (byDate.get(today) ?? []).filter((a) => a.status === 'pending').length;
  const todayInWeek = today >= weekStart && today <= addDays(weekStart, 6);
  const summary =
    !todayInWeek || items === undefined
      ? ''
      : todayPending === 0
        ? 'Hoy: nada pendiente'
        : todayPending === 1
          ? 'Hoy: 1 pendiente'
          : `Hoy: ${todayPending} pendientes`;

  const weekTitle =
    weekStart === thisWeek
      ? 'Esta semana'
      : weekStart === addDays(thisWeek, 7)
        ? 'Próxima semana'
        : weekStart === addDays(thisWeek, -7)
          ? 'Semana pasada'
          : 'Semana';

  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const swipedLeft = dx < 0;
    const goPrevious = SWIPE_LEFT_IS_PREVIOUS ? swipedLeft : !swipedLeft;
    onWeekStartChange(addDays(weekStart, goPrevious ? -7 : 7));
  }

  const gridStyle = {
    '--bar-h': `${BAR_HEIGHT}px`,
    '--rows': (maxH - minH) / 2,
  } as CSSProperties;

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
        <SyncStatus />
      </div>

      <div className="weeklabel">
        <h2 className="weeklabel__title">{weekTitle}</h2>
        <span className="weeklabel__range">
          {formatDayMonth(weekStart)} al {formatDayMonth(addDays(weekStart, 6))}
        </span>
      </div>

      <div className="cols" style={gridStyle} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="axis" aria-hidden="true">
          <span className="axis__head" />
          <span className="axis__bar">
            {ticks.map((h) => (
              <span key={h} className="axis__tick" style={{ top: `${((h - minH) / (maxH - minH)) * 100}%` }}>
                {pad(h)}
              </span>
            ))}
          </span>
        </div>

        {days.map((date) => {
          const list = byDate.get(date) ?? [];
          const blocks = layoutDay(list, rangeStart, rangeEnd);
          const isToday = date === today;
          const holiday = isHoliday(date);
          const nowTop =
            isToday && nowMin >= rangeStart && nowMin <= rangeEnd
              ? ((nowMin - rangeStart) / (rangeEnd - rangeStart)) * 100
              : null;

          return (
            <button
              key={date}
              type="button"
              className={`col${isToday ? ' col--today' : ''}${holiday ? ' col--holiday' : ''}${date < today ? ' col--past' : ''}`}
              onClick={() => onOpenDay(date)}
              aria-label={`${weekdayShort(date)} ${dayOfMonth(date)}: ${
                list.length === 0 ? 'libre' : list.length === 1 ? '1 actividad' : `${list.length} actividades`
              }${holiday ? ', feriado' : ''}`}
            >
              <span className="col__head">
                <span className="col__wd">{weekdayShort(date)}</span>
                <span className="col__num">{dayOfMonth(date)}</span>
              </span>
              <span className="col__bar">
                {blocks.map((b) => (
                  <span
                    key={b.activity.id}
                    className={`blk blk--${b.activity.priority}${b.activity.status === 'done' ? ' is-done' : ''}`}
                    style={{
                      top: `${b.top}%`,
                      height: `${b.height}%`,
                      left: `${(b.lane / b.lanes) * 100}%`,
                      width: `${100 / b.lanes}%`,
                    }}
                  />
                ))}
                {nowTop !== null && <span className="col__now" style={{ top: `${nowTop}%` }} />}
              </span>
              <span className="col__count">{list.length === 0 ? 'Libre' : list.length}</span>
            </button>
          );
        })}
      </div>

      <p className="hint">Desliza para cambiar de semana. Toca un día para ver sus actividades.</p>

      <div className="fab-wrap">
        <button type="button" className="fab" onClick={onNew}>
          + Nueva actividad
        </button>
      </div>
    </main>
  );
}
