import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../data/supabase';
import type { ActivityDraft } from '../../domain/activity';
import { formatClock, toISODate } from '../../domain/time';

interface Props {
  onClose: () => void;
  onResult: (draft: ActivityDraft, hints: string[]) => void;
}

// El reconocimiento de voz del navegador no tiene tipos en TypeScript.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRec: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

export default function QuickAddSheet({ onClose, onResult }: Props) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      recRef.current?.abort();
    };
  }, [onClose]);

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    setError('');
    const rec = new SpeechRec();
    rec.lang = 'es-EC';
    rec.interimResults = true;
    rec.continuous = false;
    const base = text.trim() ? `${text.trim()} ` : '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let heard = '';
      for (let i = 0; i < e.results.length; i++) heard += e.results[i][0].transcript;
      setText(base + heard);
      setUsedVoice(true);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      setListening(false);
      setError(
        e.error === 'not-allowed'
          ? 'Permite el micrófono para poder dictar.'
          : 'No se pudo usar el micrófono. Puedes escribir, o usar el micrófono del teclado.',
      );
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function submit() {
    const phrase = text.trim();
    if (!phrase) {
      setError('Escribe o dicta la actividad.');
      return;
    }
    if (!navigator.onLine) {
      setError('La IA necesita internet. Sin conexión, usa “+ Nueva actividad”.');
      return;
    }
    recRef.current?.stop();
    setBusy(true);
    setError('');
    try {
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const token = data.session?.access_token ?? '';
      const now = new Date();
      const res = await fetch('/api/quick-add', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          text: phrase,
          now: `${toISODate(now)} ${formatClock(now)}`,
          weekday: now.toLocaleDateString('es-EC', { weekday: 'long' }),
        }),
      });
      if (res.status === 404) {
        setError('La IA solo funciona en la versión publicada (Vercel), no en tu computador.');
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? 'No se pudo interpretar. Inténtalo de nuevo.');
        return;
      }
      onResult(
        { ...(json.draft as ActivityDraft), status: 'pending', source: usedVoice ? 'voice' : 'typed' },
        (json.assumptions as string[]) ?? [],
      );
    } catch {
      setError('No se pudo conectar. Revisa tu internet e inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Actividad rápida con IA">
        <h2 className="sheet__title">Rápida con IA</h2>
        <p className="sheet__hint">
          Dime la actividad como se la dirías a un asistente. Ejemplo: “Reunión con productores el martes a
          las 10 en la oficina, muy importante”.
        </p>

        <label className="field">
          <span>Qué quieres agendar</span>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe o dicta aquí"
            autoFocus
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="actions">
          {SpeechRec && (
            <button
              type="button"
              className={`btn mic${listening ? ' is-on' : ''}`}
              onClick={toggleMic}
              aria-pressed={listening}
            >
              {listening ? 'Escuchando… (tocar para parar)' : 'Dictar con voz'}
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={submit} disabled={busy}>
            {busy ? 'Entendiendo…' : 'Entender'}
          </button>
        </div>

        {!SpeechRec && (
          <p className="field__hint">
            Para dictar, usa el micrófono del teclado de tu celular.
          </p>
        )}

        <button type="button" className="btn-link btn-link--neutral" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </>
  );
}
