// Intérprete gratuito: convierte una frase escrita o dictada en una actividad,
// con reglas simples (sin IA, sin internet, sin costo). Siempre se revisa en el formulario.
import type { ActivityDraft, Category } from '../domain/activity';
import { extractMapLink, removeMapLinks } from '../domain/maps';
import { MONTHS, addDays, daysInMonth, pad, startOfWeek, toISODate } from '../domain/time';

export interface QuickResult {
  draft: ActivityDraft;
  hints: string[];
}

// ---------- Texto con "versión sin tildes" del mismo largo, para buscar y recortar ----------
const ACCENTS: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n',
  Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ú: 'u', Ü: 'u', Ñ: 'n',
};
const fold = (s: string) => s.replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g, (c) => ACCENTS[c]).toLowerCase();

class Text {
  orig: string;
  fold: string;
  constructor(s: string) {
    this.orig = s.normalize('NFC');
    this.fold = fold(this.orig);
  }
  peek(re: RegExp): RegExpExecArray | null {
    return re.exec(this.fold);
  }
  // Busca y recorta (reemplaza por un espacio) la primera coincidencia.
  take(re: RegExp): RegExpExecArray | null {
    const m = re.exec(this.fold);
    if (!m) return null;
    const cut = (s: string) => s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length);
    this.orig = cut(this.orig);
    this.fold = cut(this.fold);
    return m;
  }
}

// ---------- Números ----------
const WORDS: Record<string, number> = {
  una: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
};
const NUM = '\\d{1,2}|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce';
const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : WORDS[s]);
const AMPM = '(am\\b|pm\\b|a\\.\\s?m\\.?|p\\.\\s?m\\.?)';
const ampmOf = (s: string | undefined): 'am' | 'pm' | null =>
  s ? (s.startsWith('a') ? 'am' : 'pm') : null;

type Period = 'manana' | 'tarde' | 'noche' | 'am' | 'pm' | null;

function resolveHour(h: number, p: Period): { hour: number; assumed: boolean } {
  if (h > 12) return { hour: h % 24, assumed: false };
  if (p === 'pm' || p === 'tarde') return { hour: h < 12 ? h + 12 : 12, assumed: false };
  if (p === 'noche') return { hour: h === 12 ? 0 : h >= 6 ? h + 12 : h, assumed: false };
  if (p === 'am') return { hour: h === 12 ? 0 : h, assumed: false };
  if (p === 'manana') return { hour: h, assumed: false };
  if (h === 0 || h === 12) return { hour: h, assumed: false };
  if (h <= 6) return { hour: h + 12, assumed: true }; // "a las 3" en una agenda de trabajo: 15:00
  return { hour: h, assumed: false };
}

const clock = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

// ---------- Fechas ----------
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MONTH_NAMES = [...MONTHS, 'setiembre'];
const MONTH_RE = MONTH_NAMES.join('|');
const monthIndex = (name: string) => (name === 'setiembre' ? 8 : MONTHS.indexOf(name));

function makeDate(y: number, m: number, d: number): string | null {
  if (m < 0 || m > 11 || d < 1 || d > daysInMonth(y, m + 1)) return null;
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

// ---------- Prioridad y tipo ----------
const RED = /\b(?:muy\s+importante|maxima\s+prioridad|prioridad\s+(?:maxima|muy\s+alta|alta|roja)|urgente|critic[oa])\b/;
const GREEN = /\b(?:poco\s+importante|prioridad\s+(?:baja|verde))\b/;
const YELLOW = /\b(?:prioridad\s+(?:media|amarilla)|importante)\b/;

const CATEGORY_RULES: [Category, RegExp][] = [
  ['sport', /\b(futbol|gimnasio|gym|entrenar|entrenamiento|correr|trotar|nadar|natacion|ciclismo|basquet|baloncesto|voley|tenis|yoga|caminata|deporte|cancha|indoor)\b/],
  ['friends', /\b(amig[oa]s?|panas?|parche)\b/],
  ['social', /\b(cena|cumpleanos|fiesta|boda|matrimonio|bautizo|asado|graduacion|baby\s+shower|familia|familiar|paseo)\b/],
  ['work', /\b(reunion|visita|oficina|informe|reporte|cliente|productor(?:es)?|proyecto|entregar|taller|capacitacion|junta|presentacion|trabajo|mag|inspeccion|asociacion|aso|documentacion|atencion|contrato)\b/],
];

// ---------- Limpieza del título ----------
const EDGE = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'al', 'a', 'en', 'y', 'para', 'por', 'que', 'con', 'un', 'una']);
const COMMAND =
  /^\s*(?:por\s+favor[, ]*)?(?:recuerdame|recordarme|agendame|agendar|agenda|programame|programar|programa|anotame|anotar|anota|apuntame|apunta|crea|crear|ponme|pon|tengo\s+que|tengo|debo|necesito|hay|voy\s+a)\b(?:\s+que\b)?/;

function tidy(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/([,;.])(\s*[,;.])+/g, '$1')
    .replace(/^[,;.\s]+|[,;.\s]+$/g, '')
    .trim();
}

function stripEdges(s: string): string {
  const words = s.split(' ').filter(Boolean);
  while (words.length && EDGE.has(fold(words[0]))) words.shift();
  while (words.length && EDGE.has(fold(words[words.length - 1]))) words.pop();
  return words.join(' ');
}

const upperFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const ALLOWED_REMINDERS = [5, 15, 30, 60, 120, 180];

export function parseQuick(input: string, now: Date = new Date()): QuickResult {
  const hints: string[] = [];
  const phrase = input.trim();
  const today = toISODate(now);

  const link = extractMapLink(phrase);
  const t = new Text(link ? removeMapLinks(phrase) : phrase);

  // Tipo de actividad (se decide con la frase completa, antes de recortar nada).
  let category: Category = 'other';
  for (const [cat, re] of CATEGORY_RULES) {
    if (re.test(t.fold)) {
      category = cat;
      break;
    }
  }

  // ---- Recordatorio ----
  let reminder: number | null = 15;
  if (t.take(/\bsin\s+(?:recordatorio|aviso)\b/)) {
    reminder = null;
  } else {
    const r = t.take(
      new RegExp(
        `(?:avisame|avisarme|aviso|con\\s+recordatorio(?:\\s+de)?|recordatorio(?:\\s+de)?)?\\s*\\b(${NUM})\\s*(minutos?|min|horas?|hrs?|hs?)\\s+antes\\b`,
      ),
    );
    if (r) {
      const asked = num(r[1]) * (r[2].startsWith('h') ? 60 : 1);
      reminder = ALLOWED_REMINDERS.reduce((best, v) =>
        Math.abs(v - asked) < Math.abs(best - asked) ? v : best,
      );
      if (reminder !== asked) hints.push(`El aviso se ofrece en pasos fijos: puse ${reminder} minutos antes.`);
    }
  }

  // ---- Duración ----
  let durationMin: number | null = null;
  const d = t.take(
    new RegExp(`\\b(?:por|durante)\\s+(${NUM}|media)\\s*(horas?|hrs?|hs?|minutos?|min)\\b(\\s+y\\s+media)?`),
  );
  if (d) {
    const base = d[1] === 'media' ? 0.5 : num(d[1]);
    durationMin = d[2].startsWith('h') ? base * 60 + (d[3] ? 30 : 0) : base;
  }

  // ---- Parte del día ("por la tarde", "esta noche") ----
  let period: Period = null;
  let todayFlag = false;
  const pm = t.take(/\b(?:(esta)|(?:en|por|de)\s+la)\s+(manana|tarde|noche)\b/);
  if (pm) {
    period = pm[2] as Period;
    todayFlag = !!pm[1];
  }
  const noon = t.take(/\b(?:(?:al|del)\s+)?medio\s?dia\b/);

  // ---- Hora ----
  let startMin: number | null = null;
  let endMin: number | null = null;
  const assumedNotes: string[] = [];
  const note = (h: number, res: { hour: number; assumed: boolean }, mm: number) => {
    if (res.assumed) assumedNotes.push(`Entendí las ${h} como ${clock(res.hour * 60 + mm)}; si era otra hora, cámbiala.`);
  };

  const rangeA = t.take(
    new RegExp(`\\b(\\d{1,2}):(\\d{2})\\s*(?:h|hs|hrs)?\\s*(?:-|–|a|hasta)\\s*(\\d{1,2}):(\\d{2})\\s*(?:h|hs|hrs)?(?:\\s*${AMPM})?`),
  );
  const rangeB = rangeA
    ? null
    : t.take(
        new RegExp(
          `\\b(?:de|desde|entre)\\s+(?:las?\\s+)?(${NUM})(?::(\\d{2}))?\\s*(?:h|hs|hrs)?\\s*(?:a|hasta|y)\\s+(?:las?\\s+)?(${NUM})(?::(\\d{2}))?\\s*(?:h|hs|hrs)?(?:\\s*${AMPM})?`,
        ),
      );
  const range = rangeA ?? rangeB;
  if (range) {
    const h1 = num(range[1]);
    const m1 = Number(range[2] ?? 0);
    const h2 = num(range[3]);
    const m2 = Number(range[4] ?? 0);
    const p: Period = ampmOf(range[5]) ?? period;
    const a = resolveHour(h1, p);
    const b = resolveHour(h2, p);
    startMin = a.hour * 60 + m1;
    endMin = b.hour * 60 + m2;
    if (endMin <= startMin) endMin += 720;
    if (endMin > 1439) endMin = null;
    note(h1, a, m1);
  }

  if (startMin === null) {
    const s1 = t.take(
      new RegExp(
        `\\ba\\s+la(?:s)?\\s+(${NUM})(?::([0-5]\\d))?(?:\\s*(?:h|hs|hrs)\\b)?(?:\\s+y\\s+(media|cuarto)|\\s+menos\\s+(cuarto|veinte|diez|cinco))?(?:\\s*${AMPM})?`,
      ),
    );
    if (s1) {
      const h = num(s1[1]);
      const mm = Number(s1[2] ?? 0);
      const res = resolveHour(h, ampmOf(s1[5]) ?? period);
      let total = res.hour * 60 + mm;
      if (s1[3]) total += s1[3] === 'media' ? 30 : 15;
      if (s1[4]) total -= { cuarto: 15, veinte: 20, diez: 10, cinco: 5 }[s1[4]] ?? 0;
      startMin = (total + 1440) % 1440;
      note(h, res, mm);
    }
  }
  if (startMin === null) {
    const s2 = t.take(
      new RegExp(`\\b([01]?\\d|2[0-3]):([0-5]\\d)\\s*(?:${AMPM}|(?:h|hs|hrs)\\b)?`),
    );
    if (s2) {
      const h = Number(s2[1]);
      const res = resolveHour(h, ampmOf(s2[3]) ?? period);
      startMin = res.hour * 60 + Number(s2[2]);
      note(h, res, Number(s2[2]));
    }
  }
  if (startMin === null) {
    const s4 = t.take(new RegExp(`\\b(\\d{1,2})\\s*${AMPM}`));
    if (s4) {
      const res = resolveHour(Number(s4[1]), ampmOf(s4[2]));
      startMin = res.hour * 60;
    }
  }
  if (startMin === null) {
    const s3 = t.take(/\b([01]?\d|2[0-3])\s*h(?:s|rs)?(?:\s*([0-5]\d))?\b/);
    if (s3) {
      const res = resolveHour(Number(s3[1]), period);
      startMin = res.hour * 60 + Number(s3[2] ?? 0);
    }
  }
  if (startMin === null && noon) startMin = 720;
  if (startMin === null && period) {
    const defaults = { manana: 9, tarde: 15, noche: 19, am: 9, pm: 15 } as const;
    startMin = defaults[period] * 60;
    hints.push(`No dijiste la hora exacta: puse ${clock(startMin)}.`);
  }
  if (startMin === null) {
    startMin = 9 * 60;
    hints.push('No dijiste la hora: puse 09:00.');
  }
  hints.push(...assumedNotes);

  if (endMin === null && durationMin !== null) {
    const e = startMin + durationMin;
    endMin = e <= 1439 ? e : null;
  }

  // ---- Fecha ----
  const year = now.getFullYear();
  const todayDow = now.getDay();
  let date: string | null = null;
  let rolledOver = false;

  const dm = t.take(new RegExp(`\\b(?:el\\s+)?(\\d{1,2})\\s+de\\s+(${MONTH_RE})(?:\\s+(?:de|del)\\s+(\\d{4}))?\\b`));
  if (dm) {
    const explicitYear = dm[3] ? Number(dm[3]) : null;
    date = makeDate(explicitYear ?? year, monthIndex(dm[2]), Number(dm[1]));
    if (date && !explicitYear && date < today) {
      date = makeDate(year + 1, monthIndex(dm[2]), Number(dm[1]));
      rolledOver = true;
    }
  }
  if (!date) {
    const sl = t.take(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (sl) {
      let y = sl[3] ? Number(sl[3]) : year;
      if (y < 100) y += 2000;
      date = makeDate(y, Number(sl[2]) - 1, Number(sl[1]));
      if (date && !sl[3] && date < today) {
        date = makeDate(year + 1, Number(sl[2]) - 1, Number(sl[1]));
        rolledOver = true;
      }
    }
  }

  const nextWeek = !!t.take(
    /\b(?:la\s+)?(?:semana\s+(?:proxima|que\s+viene|siguiente)|proxima\s+semana|siguiente\s+semana)\b/,
  );

  const wdRe = new RegExp(`\\b(?:el\\s+)?(?:(este|esta|proximo|siguiente)\\s+)?(${WEEKDAYS.join('|')})s?\\b`);
  const wdNum = new RegExp(`\\b(?:el\\s+)?(?:(este|esta|proximo|siguiente)\\s+)?(${WEEKDAYS.join('|')})s?\\s+(\\d{1,2})\\b(?![:/\\d])`);
  const wdFor = (m: RegExpExecArray): string => {
    const target = WEEKDAYS.indexOf(m[2]);
    if (nextWeek) return addDays(startOfWeek(today), 7 + ((target + 6) % 7));
    const diff = (target - todayDow + 7) % 7;
    const useToday = m[1] === 'este' || m[1] === 'esta';
    return addDays(today, useToday ? diff : diff === 0 ? 7 : diff);
  };
  let weekdayDate: string | null = null;
  const withNum = t.peek(wdNum);
  if (withNum) {
    const candidate = wdFor(withNum);
    if (Number(candidate.slice(8)) === Number(withNum[3])) {
      t.take(wdNum);
      weekdayDate = candidate;
    }
  }
  if (!weekdayDate) {
    const w = t.take(wdRe);
    if (w) weekdayDate = wdFor(w);
  }
  if (!date && weekdayDate) date = weekdayDate;

  // "hoy", "mañana", "pasado mañana", "en 3 días"
  let rel: number | null = null;
  if (t.take(/\bpasado\s+manana\b/)) rel = 2;
  else if (t.take(/\bmanana\b/)) rel = 1;
  else if (t.take(/\bhoy\b/)) rel = 0;
  const inDays = t.take(new RegExp(`\\b(?:en|dentro\\s+de)\\s+(${NUM})\\s+dias?\\b`));
  const inWeeks = t.take(new RegExp(`\\b(?:en|dentro\\s+de)\\s+(${NUM})\\s+semanas?\\b`));
  if (!date && rel !== null) date = addDays(today, rel);
  if (!date && inDays) date = addDays(today, num(inDays[1]));
  if (!date && inWeeks) date = addDays(today, 7 * num(inWeeks[1]));

  if (!date) {
    const dom = t.take(/\bel\s+(\d{1,2})\b(?!\s*[:/])/);
    if (dom) {
      const day = Number(dom[1]);
      let candidate = makeDate(now.getFullYear(), now.getMonth(), day);
      if (candidate && candidate < today) {
        const next = new Date(year, now.getMonth() + 1, 1);
        candidate = makeDate(next.getFullYear(), next.getMonth(), day);
      }
      date = candidate;
    }
  }
  if (!date && nextWeek) {
    date = addDays(startOfWeek(today), 7);
    hints.push('Dijiste “la próxima semana” sin un día: puse el lunes.');
  }
  if (!date && todayFlag) date = today;
  if (!date) {
    date = today;
    hints.push('No dijiste la fecha: puse hoy.');
  }
  if (rolledOver) hints.push('Esa fecha ya pasó este año: la puse en el año siguiente.');

  // ---- Prioridad ----
  let priority: ActivityDraft['priority'] = 'none';
  if (t.take(RED)) priority = 'red';
  else if (t.take(GREEN)) priority = 'green';
  else if (t.take(YELLOW)) priority = 'yellow';
  else t.take(/\bsin\s+prioridad\b/);
  t.take(/\bprioridad\b/);

  // ---- Lugar ----
  let rest = tidy(t.orig);
  let location = '';
  const en = new RegExp(
    '\\ben\\s+(?:(?:el|la|los|las)\\s+)?([^,.;]+?)(?=\\s+(?:con|para|por|y|que|de\\s+la)\\s|\\s*[,.;]|\\s*$)',
  ).exec(fold(rest));
  if (en) {
    const end = en.index + en[0].length;
    const start = end - en[1].length;
    location = rest.slice(start, end).trim();
    rest = tidy(rest.slice(0, en.index) + ' ' + rest.slice(end));
  }

  // ---- Título, lugar por comas y notas ----
  const segments = rest.split(',').map((s) => s.trim()).filter(Boolean);
  let title = segments[0] ?? '';
  const extras = segments.slice(1).join(', ');
  let notes = '';
  if (extras) {
    if (location) notes = extras;
    else location = extras;
  }

  const cmd = COMMAND.exec(fold(title));
  if (cmd) title = title.slice(cmd[0].length);
  title = upperFirst(stripEdges(tidy(title)));
  if (!title) {
    title = upperFirst(phrase.slice(0, 60));
    hints.push('No pude identificar el nombre de la actividad: revisa el título.');
  }

  location = upperFirst(location);
  if (link) location = [location, link].filter(Boolean).join(' ');

  return {
    draft: {
      title,
      category,
      date,
      startTime: clock(startMin),
      endTime: endMin !== null ? clock(endMin) : null,
      priority,
      location,
      notes,
      reminderMinutes: reminder,
      status: 'pending',
      source: 'typed',
    },
    hints,
  };
}
