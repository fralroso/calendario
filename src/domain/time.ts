// Utilidades de fecha y hora. Las fechas son texto YYYY-MM-DD en hora local,
// para evitar errores de zona horaria.

export const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function formatClock(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatLongDate(iso: string): { weekday: string; rest: string } {
  const d = parseISODate(iso);
  return {
    weekday: d.toLocaleDateString('es-EC', { weekday: 'long' }),
    rest: d.toLocaleDateString('es-EC', { day: 'numeric', month: 'long' }),
  };
}
