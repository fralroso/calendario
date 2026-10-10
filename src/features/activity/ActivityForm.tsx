import { useEffect, useState, type FormEvent } from 'react';
import { listByDate, removeActivity, saveActivity } from '../../data/activityRepository';
import DateField from '../../components/DateField';
import TimeField from '../../components/TimeField';
import {
  CATEGORIES,
  PRIORITIES,
  REMINDER_OPTIONS,
  STATUSES,
  type Activity,
  type ActivityDraft,
  type Category,
  type Priority,
  type Status,
} from '../../domain/activity';
import { findConflicts } from '../../domain/conflicts';
import { extractMapLink } from '../../domain/maps';
import { pad, toISODate, toMinutes } from '../../domain/time';

interface Props {
  initial: Activity | null; // null = actividad nueva
  defaultDate: string;
  prefill?: ActivityDraft; // datos propuestos por "Agregar rápido", para revisar antes de guardar
  hints?: string[]; // suposiciones del intérprete
  onClose: () => void;
}

function defaultStart(date: string): string {
  const now = new Date();
  if (date === toISODate(now)) return `${pad(Math.min(23, now.getHours() + 1))}:00`;
  return '09:00';
}

export default function ActivityForm({ initial, defaultDate, prefill, hints, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? prefill?.title ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? prefill?.category ?? 'work');
  const [date, setDate] = useState(initial?.date ?? prefill?.date ?? defaultDate);
  const [startTime, setStartTime] = useState(initial?.startTime ?? prefill?.startTime ?? defaultStart(defaultDate));
  const [endTime, setEndTime] = useState(initial?.endTime ?? prefill?.endTime ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? prefill?.priority ?? 'none');
  const [location, setLocation] = useState(initial?.location ?? prefill?.location ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? prefill?.notes ?? '');
  const [reminder, setReminder] = useState<number | null>(
    initial ? initial.reminderMinutes : prefill ? prefill.reminderMinutes : 15,
  );
  const [status, setStatus] = useState<Status>(initial?.status ?? 'pending');
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState<Activity[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function buildDraft(): ActivityDraft {
    return {
      title: title.trim(),
      category,
      date,
      startTime,
      endTime: endTime || null,
      priority,
      location: location.trim(),
      notes: notes.trim(),
      reminderMinutes: reminder,
      status,
      source: initial?.source ?? prefill?.source ?? 'typed',
    };
  }

  async function persist() {
    await saveActivity(buildDraft(), initial?.id);
    onClose();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError('Escribe un título.');
    if (!date || !startTime) return setError('Elige la fecha y la hora de inicio.');
    if (endTime && toMinutes(endTime) <= toMinutes(startTime)) {
      return setError('La hora de fin debe ser posterior a la de inicio.');
    }
    setError('');

    if (status !== 'cancelled') {
      const found = findConflicts(
        { id: initial?.id, date, startTime, endTime: endTime || null },
        await listByDate(date),
      );
      if (found.length > 0) {
        setConflicts(found);
        return; // solo avisa; el usuario decide
      }
    }
    await persist();
  }

  async function onDelete() {
    if (initial && window.confirm('¿Eliminar esta actividad?')) {
      await removeActivity(initial.id);
      onClose();
    }
  }

  const mapLink = extractMapLink(location);

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={initial ? 'Editar actividad' : prefill ? 'Revisar actividad' : 'Nueva actividad'}
      >
        <h2 className="sheet__title">
          {initial ? 'Editar actividad' : prefill ? 'Revisar actividad' : 'Nueva actividad'}
        </h2>

        {!initial && prefill && (
          <div className="notice">
            <p className="notice__title">Esto es lo que entendí. Revisa antes de guardar.</p>
            {hints && hints.length > 0 && (
              <ul className="notice__list">
                {hints.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <label className="field">
            <span>Título</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={!initial}
              placeholder="Ej.: Reunión con productores"
            />
          </label>

          <DateField value={date} onChange={setDate} />

          <div className="time-grid">
            <TimeField label="Inicio" value={startTime} onChange={setStartTime} />
            <TimeField label="Fin (opcional)" value={endTime} onChange={setEndTime} optional />
          </div>

          <fieldset className="choice">
            <legend>Tipo</legend>
            <div className="choice__row">
              {CATEGORIES.map((c) => (
                <label key={c.value} className={`chip${category === c.value ? ' is-on' : ''}`}>
                  <input
                    type="radio"
                    name="category"
                    value={c.value}
                    checked={category === c.value}
                    onChange={() => setCategory(c.value)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="choice">
            <legend>Prioridad</legend>
            <div className="choice__row">
              {PRIORITIES.map((p) => (
                <label key={p.value} className={`chip${priority === p.value ? ' is-on' : ''}`}>
                  <input
                    type="radio"
                    name="priority"
                    value={p.value}
                    checked={priority === p.value}
                    onChange={() => setPriority(p.value)}
                  />
                  <span className={`dot dot--${p.value}`} aria-hidden="true" />
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span>Ubicación / Referencia</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej.: Oficina, o pega un enlace de mapa"
            />
            <small className="field__hint">
              Puedes pegar un enlace de Google Maps, Apple Maps u otro mapa.
            </small>
          </label>
          {mapLink && (
            <a className="maplink" href={mapLink} target="_blank" rel="noopener noreferrer">
              Abrir en el mapa
            </a>
          )}

          <label className="field">
            <span>Notas</span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <label className="field">
            <span>Recordatorio</span>
            <select
              value={reminder === null ? '' : String(reminder)}
              onChange={(e) => setReminder(e.target.value === '' ? null : Number(e.target.value))}
            >
              {REMINDER_OPTIONS.map((o) => (
                <option key={String(o.value)} value={o.value === null ? '' : String(o.value)}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {initial && (
            <fieldset className="choice">
              <legend>Estado</legend>
              <div className="choice__row">
                {STATUSES.map((s) => (
                  <label key={s.value} className={`chip${status === s.value ? ' is-on' : ''}`}>
                    <input
                      type="radio"
                      name="status"
                      value={s.value}
                      checked={status === s.value}
                      onChange={() => setStatus(s.value)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          {conflicts.length > 0 ? (
            <div className="conflict" role="alert">
              <p className="conflict__title">
                ⚠️{' '}
                {conflicts.length === 1
                  ? `Ya tienes una actividad programada a las ${conflicts[0].startTime}.`
                  : `Ya tienes ${conflicts.length} actividades programadas en ese horario.`}
              </p>
              <p className="conflict__label">
                {conflicts.length === 1 ? 'Actividad existente:' : 'Actividades existentes:'}
              </p>
              <ul className="conflict__list">
                {conflicts.map((c) => (
                  <li key={c.id}>
                    <strong>{c.startTime}</strong> {c.title}
                  </li>
                ))}
              </ul>
              <p className="conflict__ask">¿Quieres registrar la nueva actividad de todas maneras?</p>
              <div className="actions">
                <button type="button" className="btn" onClick={() => setConflicts([])}>
                  Cancelar
                </button>
                <button type="button" className="btn btn--primary" onClick={persist}>
                  Registrar de todas maneras
                </button>
              </div>
            </div>
          ) : (
            <div className="actions">
              <button type="button" className="btn" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary">
                Guardar
              </button>
            </div>
          )}

          {initial && conflicts.length === 0 && (
            <button type="button" className="btn-link" onClick={onDelete}>
              Eliminar actividad
            </button>
          )}
        </form>
      </div>
    </>
  );
}
