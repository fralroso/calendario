// Reglas y tipos del negocio. No depende de pantalla ni de base de datos.

export type Priority = 'none' | 'green' | 'yellow' | 'red';
export type Status = 'pending' | 'done' | 'cancelled';
export type Source = 'typed' | 'voice' | 'image';
export type SyncState = 'pending' | 'synced';
export type Category = 'work' | 'friends' | 'social' | 'sport' | 'other';

export interface Activity {
  id: string; // se genera en el dispositivo, así se puede crear sin internet
  userId: string; // 'local' hasta que exista login
  title: string;
  category: Category;
  date: string; // YYYY-MM-DD (hora local)
  startTime: string; // HH:mm (24 horas)
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
  | 'category'
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

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'work', label: 'Trabajo' },
  { value: 'friends', label: 'Amigos' },
  { value: 'social', label: 'Social' },
  { value: 'sport', label: 'Deportiva' },
  { value: 'other', label: 'Otros' },
];

export const CATEGORY_LABEL: Record<Category, string> = {
  work: 'Trabajo',
  friends: 'Amigos',
  social: 'Social',
  sport: 'Deportiva',
  other: 'Otros',
};

// Para espacios muy angostos (las barras de la semana en un celular).
export const CATEGORY_SHORT: Record<Category, string> = {
  work: 'Trab',
  friends: 'Amig',
  social: 'Soc',
  sport: 'Dep',
  other: 'Otro',
};

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'none', label: 'Sin prioridad' },
  { value: 'green', label: 'Poco importante' },
  { value: 'yellow', label: 'Importante' },
  { value: 'red', label: 'Muy importante' },
];

export const PRIORITY_LABEL: Record<Priority, string> = {
  none: 'Sin prioridad',
  green: 'Poco importante',
  yellow: 'Importante',
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
  { value: 120, label: '2 horas antes' },
  { value: 180, label: '3 horas antes' },
];
