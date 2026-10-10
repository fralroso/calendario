import { useLiveQuery } from 'dexie-react-hooks';
import { countUrgent } from '../../data/taskRepository';
import { toISODate } from '../../domain/time';

// Cantidad de pendientes vencidos o que vencen hoy.
export function useUrgentCount(): number {
  return useLiveQuery(() => countUrgent(toISODate(new Date())), [], 0);
}
