// Feriados de Ecuador 2026 (fechas indicadas por el usuario, con los fines de semana largos).
// Para agregar otro año u otro feriado, basta con sumar la fecha (YYYY-MM-DD) a la lista.
const HOLIDAYS = new Set<string>([
  // Independencia de Guayaquil
  '2026-10-09', '2026-10-10', '2026-10-11',
  // Día de los Difuntos e Independencia de Cuenca
  '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03',
  // Navidad
  '2026-12-25', '2026-12-26', '2026-12-27',
]);

export const isHoliday = (iso: string): boolean => HOLIDAYS.has(iso);
