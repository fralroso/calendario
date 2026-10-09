import { useEffect, useState } from 'react';
import { startSync } from '../data/sync';
import type { Activity } from '../domain/activity';
import { startOfWeek, toISODate } from '../domain/time';
import ActivityForm from '../features/activity/ActivityForm';
import LoginSheet from '../features/auth/LoginSheet';
import DayView from '../features/day/DayView';
import WeekView from '../features/week/WeekView';

// Pantalla principal: dos semanas (esta y la siguiente). De ahí se entra a un día,
// y del día a cada actividad.
export default function App() {
  useEffect(() => startSync(), []);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(toISODate(new Date())));
  const [dayDate, setDayDate] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Activity | 'new' | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  const newActivityDate = dayDate ?? toISODate(new Date());

  return (
    <>
      {dayDate === null ? (
        <WeekView
          weekStart={weekStart}
          onWeekStartChange={setWeekStart}
          onOpenDay={setDayDate}
          onNew={() => setSheet('new')}
          onLogin={() => setShowLogin(true)}
        />
      ) : (
        <DayView
          date={dayDate}
          onDateChange={setDayDate}
          onBack={() => setDayDate(null)}
          onNew={() => setSheet('new')}
          onOpen={setSheet}
          onLogin={() => setShowLogin(true)}
        />
      )}

      {sheet !== null && (
        <ActivityForm
          initial={sheet === 'new' ? null : sheet}
          defaultDate={newActivityDate}
          onClose={() => setSheet(null)}
        />
      )}
      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
    </>
  );
}
