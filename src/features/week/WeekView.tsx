import { useRef, useState, type CSSProperties, type ReactNode, type TouchEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listRange } from '../../data/activityRepository';
import { CATEGORY_LABEL, CATEGORY_SHORT, type Activity } from '../../domain/activity';
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
import FabBar from '../../components/FabBar';
import SyncStatus from '../sync/SyncStatus';
import { useNow } from '../day/useNow';

interface Props {
  tabs: ReactNode;
  weekStart: string;
  onWeekStartChange: (weekStart: string) => void;
  onOpenDay: (date: string) => void;
  onNew: () => void;
  onQuick: () => void;
}

// Deslizar el dedo hacia la izquierda lleva a la semana siguiente, hacia la derecha a la pasada.
// Si se siente al revés, basta con cambiar este valor a true.
const SWIPE_LEFT_IS_PREVIOUS = false;
const BAR_HEIGHT_ONE = 400; // px con una semana
const BAR_HEIGHT_TWO = 150; // px con dos semanas

interface BarsProps {
  weekStart: string;
  byDate: Map<string, Activity[]>;
  today: string;
  nowMin: number;
  minH: number;
  maxH: number;
  barHeight: number;
  compact: boolean;
  onOpenDay: (date: string) => void;
}

// Siete barras verticales (lunes a domingo) de una semana.
function WeekBars({ weekStart, byDate, today, nowMin, minH, maxH, barHeight, compact, onOpenDay }: BarsProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const rangeStart = minH * 60;
  const rangeEnd = maxH * 60;
  const step = compact ? 4 : 2;
  const ticks: number[] = [];
  for (let h = minH; h <= maxH; h += step) ticks.push(h);

  const gridStyle = {
    '--bar-h': `${barHeight}px`,
    '--rows': (maxH - minH) / 2,
  } as CSSProperties;

  return (
    <div className={`cols${compact ? ' cols--compact' : ''}`} style={gridStyle}>
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
              {blocks.map((b) => {
                const px = (b.height / 100) * barHeight;
                return (
                  <span
                    key={b.activity.id}
                    className={`blk blk--${b.activity.priority}${b.activity.status === 'done' ? ' is-done' : ''}`}
                    style={{
                      top: `${b.top}%`,
                      height: `${b.height}%`,
                      left: `${(b.lane / b.lanes) * 100}%`,
                      width: `${100 / b.lanes}%`,
                    }}
                  >
                    {b.lanes === 1 && px >= 16 && (
                      <>
                        <span className="blk__t">{b.activity.startTime}</span>
                        {px >= 24 && (
                          <span className="blk__c">
                            <span className="blk__cs">{CATEGORY_SHORT[b.activity.category]}</span>
                            <span className="blk__cf">{CATEGORY_LABEL[b.activity.category]}</span>
                          </span>
                        )}
                      </>
                    )}
                  </span>
                );
              })}
              {nowTop !== null && <span className="col__now" style={{ top: `${nowTop}%` }} />}
            </span>
            <span className="col__count">{list.length === 0 ? 'Libre' : list.length}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function WeekView({ tabs, weekStart, onWeekStartChange, onOpenDay, onNew, onQuick }: Props) {
  const now = useNow();
  const today = toISODate(now);
  const thisWeek = startOfWeek(today);
  const touch = useRef<{ x: number; y: number } | null>(null);

  // Por defecto se ven dos semanas (7 barras arriba y 7 abajo); se puede cambiar a una sola.
  const [twoWeeks, setTwoWeeks] = useState(() => {
    try {
      return localStorage.getItem('calendario:weeks') !== '1';
    } catch {
      return true;
    }
  });
  function chooseMode(two: boolean) {
    setTwoWeeks(two);
    try {
      localStorage.setItem('calendario:weeks', two ? '2' : '1');
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
  }

  const lastDay = addDays(weekStart, twoWeeks ? 13 : 6);
  const items = useLiveQuery(() => listRange(weekStart, lastDay), [weekStart, lastDay]);
  const weeks = twoWeeks ? [weekStart, addDays(weekStart, 7)] : [weekStart];
  const barHeight = twoWeeks ? BAR_HEIGHT_TWO : BAR_HEIGHT_ONE;

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
  const nowMin = nowMinutes(now);

  const { weekday, rest } = formatLongDate(today);
  const todayLeft = (byDate.get(today) ?? []).filter((a) => a.status === 'pending').length;
  const todayInView = today >= weekStart && today <= lastDay;
  const summary =
    !todayInView || items === undefined
      ? ''
      : todayLeft === 0
        ? 'Hoy: nada por hacer'
        : todayLeft === 1
          ? 'Hoy: 1 actividad por hacer'
          : `Hoy: ${todayLeft} por hacer`;

  function weekTitle(start: string): string {
    if (start === thisWeek) return 'Esta semana';
    if (start === addDays(thisWeek, 7)) return 'Próxima semana';
    if (start === addDays(thisWeek, -7)) return 'Semana pasada';
    return 'Semana';
  }

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

  return (
    <main className="app">
      {tabs}

      <header className="head">
        <div>
          <h1 className="head__weekday head__weekday--week">{weekday}</h1>
          <p className="head__rest">{rest}</p>
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

      <div className="viewtoggle" role="group" aria-label="Semanas a mostrar">
        <button type="button" className={`vt${!twoWeeks ? ' is-on' : ''}`} aria-pressed={!twoWeeks} onClick={() => chooseMode(false)}>
          1 semana
        </button>
        <button type="button" className={`vt${twoWeeks ? ' is-on' : ''}`} aria-pressed={twoWeeks} onClick={() => chooseMode(true)}>
          2 semanas
        </button>
      </div>

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="weeks">
        {weeks.map((start) => (
          <section key={start} className="weekblock">
            <div className="weeklabel">
              <h2 className="weeklabel__title">{weekTitle(start)}</h2>
              <span className="weeklabel__range">
                {formatDayMonth(start)} al {formatDayMonth(addDays(start, 6))}
              </span>
            </div>
            <WeekBars
              weekStart={start}
              byDate={byDate}
              today={today}
              nowMin={nowMin}
              minH={minH}
              maxH={maxH}
              barHeight={barHeight}
              compact={twoWeeks}
              onOpenDay={onOpenDay}
            />
          </section>
        ))}
      </div>

      <p className="hint">Desliza para cambiar de semana. Toca un día para ver sus actividades.</p>

      <FabBar onNew={onNew} onQuick={onQuick} />
    </main>
  );
}
