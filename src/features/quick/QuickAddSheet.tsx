import { useEffect, useRef, useState } from 'react';
import type { ActivityDraft } from '../../domain/activity';
import { parseQuick } from '../../parsing/quickParser';

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

const EXAMPLES = [
  'Reunión con productores el martes a las 10 en la oficina, muy importante',
  'Mañana a las 9 de la mañana llamar a Juan, prioridad alta',
];

export default function QuickAddSheet({ onClose, onResult }: Props) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
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

  function submit() {
    const phrase = text.trim();
    if (!phrase) {
      setError('Escribe o dicta la actividad.');
      return;
    }
    recRef.current?.stop();
    const { draft, hints } = parseQuick(phrase, new Date());
    onResult({ ...draft, source: usedVoice ? 'voice' : 'typed' }, hints);
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Agregar rápido">
        <h2 className="sheet__title">Agregar rápido</h2>
        <p className="sheet__hint">
          Escribe o dicta la actividad con el día, la hora, el lugar y la prioridad. Después podrás revisarla
          antes de guardar.
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

        <div className="examples">
          <span className="field__hint">Ejemplos (toca uno para probarlo):</span>
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="example" onClick={() => setText(ex)}>
              {ex}
            </button>
          ))}
        </div>

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
          <button type="button" className="btn btn--primary" onClick={submit}>
            Continuar
          </button>
        </div>

        {!SpeechRec && (
          <p className="field__hint">Para dictar, usa el micrófono del teclado de tu celular.</p>
        )}

        <button type="button" className="btn-link btn-link--neutral" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </>
  );
}
