import type { Activity } from './activity';
import { toMinutes } from './time';

type Slot = Pick<Activity, 'date' | 'startTime' | 'endTime'>;

// Una actividad sin hora de fin ocupa solo su minuto de inicio.
function interval(a: Pick<Activity, 'startTime' | 'endTime'>): [number, number] {
  const start = toMinutes(a.startTime);
  const end = a.endTime ? toMinutes(a.endTime) : start;
  return [start, end > start ? end : start + 1];
}

// Devuelve las actividades que chocan con la nueva. Solo avisa: nunca bloquea.
export function findConflicts<T extends Slot & { id: string; status: Activity['status'] }>(
  candidate: Slot & { id?: string },
  existing: T[],
): T[] {
  const [s, e] = interval(candidate);
  return existing
    .filter((a) => {
      if (a.id === candidate.id) return false; // al editar, no choca consigo misma
      if (a.date !== candidate.date) return false;
      if (a.status === 'cancelled') return false;
      const [as, ae] = interval(a);
      return s < ae && as < e;
    })
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}
