// Reglas y tipos del negocio. No depende de pantalla ni de base de datos.

export type Priority = 'none' | 'green' | 'yellow' | 'red';
export type Status = 'pending' | 'done' | 'cancelled';
export type Source = 'typed' | 'voice' | 'image';
export type SyncState = 'pending' | 'synced';

export interface Activity {
  id: string; // se genera en el dispositivo, así se puede crear sin internet
  userId: string; // 'local' hasta que exista login
  title: string;
  date: string; // YYYY-MM-DD (hora local)
  startTime: string; // HH:mm
  endTime: string | null; // HH:mm
  priority: Priority;
  location: string; // "Ubicación / Referencia"
  notes: string;
  reminderMinutes: number | null;
  status: Status;
  source: Source;
  createdAt: number;
  updatedAt: number; // para saber qué versión es la más reciente al sincronizar
  deletedAt: number | null; // borrado "suave": se sincroniza como cualquier cambio
  syncState: SyncState;
}

// Lo que produce el formulario hoy, y la voz / imagen después.
export type ActivityDraft = Pick<
  Activity,
  | 'title'
  | 'date'
  | 'startTime'
  | 'endTime'
  | 'priority'
  | 'location'
  | 'notes'
  | 'reminderMinutes'
  | 'status'
  | 'source'
>;

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'none', label: 'Sin prioridad' },
  { value: 'green', label: 'Importante' },
  { value: 'yellow', label: 'Más importante' },
  { value: 'red', label: 'Muy importante' },
];

export const PRIORITY_LABEL: Record<Priority, string> = {
  none: 'Sin prioridad',
  green: 'Importante',
  yellow: 'Más importante',
  red: 'Muy importante',
};

export const STATUSES: { value: Status; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'done', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
];

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Sin recordatorio' },
  { value: 5, label: '5 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
];
