// Función de Vercel: recibe una frase (escrita o dictada) y devuelve una actividad.
// La clave de la IA vive solo en el servidor (variable ANTHROPIC_API_KEY en Vercel).

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

const SYSTEM = `Eres el asistente de una agenda personal en español (Latinoamérica).
Conviertes una frase en UNA actividad. Responde SOLO con un objeto JSON, sin texto antes ni después y sin bloques de código.

Campos:
- "title": texto corto con el nombre de la actividad, sin fecha ni hora.
- "date": "YYYY-MM-DD".
- "startTime": "HH:mm" en 24 horas.
- "endTime": "HH:mm" o null.
- "category": "work" (trabajo), "friends" (amigos), "social", "sport" (deportiva) u "other".
- "priority": "none", "green" (poco importante), "yellow" (importante) o "red" (muy importante, urgente, prioridad máxima).
- "location": lugar o referencia; si hay un enlace de mapa, consérvalo completo; si no hay, "".
- "notes": detalles adicionales; si no hay, "".
- "reminderMinutes": null, 5, 15, 30, 60, 120 o 180 (solo si la persona pide un aviso).
- "assumptions": lista corta de frases en español con lo que tuviste que suponer.

Reglas:
- Calcula "mañana", "el martes", "el próximo lunes", etc. con la fecha y hora de hoy que se te indica. Un día de la semana sin más detalle es el próximo que llegue (si hoy es ese día, el de la semana siguiente, salvo que diga "hoy").
- "de la mañana" es AM, "de la tarde" y "de la noche" son PM. Si dicen "a las 3" sin más, usa la hora más razonable para una agenda de trabajo y anótalo en "assumptions".
- Si no dicen la hora, usa "09:00" y anótalo en "assumptions". Si no dicen la fecha, usa hoy y anótalo.
- Si dicen una duración ("por dos horas"), calcula "endTime".
- Prioridad: sin mención, "none".
- No inventes lugares ni detalles que la persona no dijo.`;

const CATEGORIES = ['work', 'friends', 'social', 'sport', 'other'];
const PRIORITIES = ['none', 'green', 'yellow', 'red'];
const REMINDERS = [5, 15, 30, 60, 120, 180];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// Valida lo que devuelve la IA: nunca se confía en el formato.
function normalize(raw: any, phrase: string, today: string) {
  const assumptions: string[] = Array.isArray(raw?.assumptions)
    ? raw.assumptions.filter((a: unknown) => typeof a === 'string').slice(0, 5)
    : [];

  let date = str(raw?.date, 10);
  if (!DATE.test(date)) {
    date = today;
    assumptions.push('No pude entender la fecha: puse hoy.');
  }
  let startTime = str(raw?.startTime, 5);
  if (!TIME.test(startTime)) {
    startTime = '09:00';
    assumptions.push('No pude entender la hora: puse 09:00.');
  }
  let endTime: string | null = str(raw?.endTime, 5);
  if (!TIME.test(endTime) || endTime <= startTime) endTime = null;

  return {
    draft: {
      title: str(raw?.title, 120) || phrase.slice(0, 120),
      category: CATEGORIES.includes(raw?.category) ? raw.category : 'other',
      date,
      startTime,
      endTime,
      priority: PRIORITIES.includes(raw?.priority) ? raw.priority : 'none',
      location: str(raw?.location, 300),
      notes: str(raw?.notes, 500),
      reminderMinutes: REMINDERS.includes(raw?.reminderMinutes) ? raw.reminderMinutes : null,
    },
    assumptions,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!anthropicKey) return res.status(500).json({ error: 'La IA todavía no está configurada.' });
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Falta la configuración de Supabase en el servidor.' });
  }

  // Solo personas con sesión pueden usar la IA (evita gastos por abuso).
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Inicia sesión para usar la IA.' });
  const who = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
  });
  if (!who.ok) return res.status(401).json({ error: 'Tu sesión venció. Vuelve a entrar.' });

  let body: any = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const phrase = str(body?.text, 600);
  const now = str(body?.now, 20); // "2026-10-10 15:42", hora local de la persona
  const weekday = str(body?.weekday, 20);
  if (!phrase) return res.status(400).json({ error: 'Escribe o dicta la actividad.' });
  const today = DATE.test(now.slice(0, 10)) ? now.slice(0, 10) : new Date().toISOString().slice(0, 10);

  let reply: Response;
  try {
    reply = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: `Hoy es ${weekday} ${now} (hora local).\nFrase: """${phrase}"""`,
          },
        ],
      }),
    });
  } catch {
    return res.status(502).json({ error: 'No se pudo contactar a la IA. Inténtalo de nuevo.' });
  }
  if (!reply.ok) return res.status(502).json({ error: 'La IA no respondió. Inténtalo de nuevo.' });

  const data: any = await reply.json();
  const textOut: string = (data.content ?? [])
    .map((b: any) => (b.type === 'text' ? b.text : ''))
    .join('');
  const start = textOut.indexOf('{');
  const end = textOut.lastIndexOf('}');
  let parsed: any = null;
  try {
    parsed = JSON.parse(textOut.slice(start, end + 1));
  } catch {
    return res.status(502).json({ error: 'No pude entender la respuesta de la IA. Inténtalo de nuevo.' });
  }

  return res.status(200).json(normalize(parsed, phrase, today));
}
