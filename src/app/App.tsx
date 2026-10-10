import { useEffect, useState } from 'react';
import { supabase } from '../data/supabase';
import { startSync } from '../data/sync';
import type { Activity, ActivityDraft } from '../domain/activity';
import { startOfWeek, toISODate } from '../domain/time';
import ActivityForm from '../features/activity/ActivityForm';
import LoginScreen from '../features/auth/LoginScreen';
import { useSession } from '../features/auth/useSession';
import DayView from '../features/day/DayView';
import QuickAddSheet from '../features/quick/QuickAddSheet';
import WeekView from '../features/week/WeekView';

interface Proposal {
  draft: ActivityDraft;
  hints: string[];
}

// Sin sesión no se muestra nada: solo la pantalla de entrada.
// Con sesión: semana -> día -> actividad.
export default function App() {
  const { session, ready } = useSession();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(toISODate(new Date())));
  const [dayDate, setDayDate] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Activity | 'new' | null>(null);
  const [quick, setQuick] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);

  useEffect(() => startSync(), []);

  // Al cerrar sesión se vuelve al inicio y se cierra cualquier ventana abierta.
  useEffect(() => {
    if (!session) {
      setDayDate(null);
      setSheet(null);
      setQuick(false);
      setProposal(null);
    }
  }, [session]);

  if (supabase) {
    if (!ready) return <main className="gate" aria-busy="true" />;
    if (!session) return <LoginScreen />;
  }

  const newActivityDate = dayDate ?? toISODate(new Date());
  const closeForm = () => {
    setSheet(null);
    setProposal(null);
  };

  return (
    <>
      {dayDate === null ? (
        <WeekView
          weekStart={weekStart}
          onWeekStartChange={setWeekStart}
          onOpenDay={setDayDate}
          onNew={() => setSheet('new')}
          onQuick={() => setQuick(true)}
        />
      ) : (
        <DayView
          date={dayDate}
          onDateChange={setDayDate}
          onBack={() => setDayDate(null)}
          onNew={() => setSheet('new')}
          onQuick={() => setQuick(true)}
          onOpen={setSheet}
        />
      )}

      {quick && (
        <QuickAddSheet
          onClose={() => setQuick(false)}
          onResult={(draft, hints) => {
            setQuick(false);
            setProposal({ draft, hints });
            setSheet('new');
          }}
        />
      )}

      {sheet !== null && (
        <ActivityForm
          initial={sheet === 'new' ? null : sheet}
          defaultDate={newActivityDate}
          prefill={sheet === 'new' ? proposal?.draft : undefined}
          hints={sheet === 'new' ? proposal?.hints : undefined}
          onClose={closeForm}
        />
      )}
    </>
  );
}
