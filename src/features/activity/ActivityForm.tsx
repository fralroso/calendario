import { useEffect, useState, type FormEvent } from 'react';
import { listByDate, removeActivity, saveActivity } from '../../data/activityRepository';
import {
  PRIORITIES,
  REMINDER_OPTIONS,
  STATUSES,
  type Activity,
  type ActivityDraft,
  type Priority,
  type Status,
} from '../../domain/activity';
import { findConflicts } from '../../domain/conflicts';
import { pad, toISODate, toMinutes } from '../../domain/time';

interface Props {
  initial: Activity | null; // null = actividad nueva
  defaultDate: string;
  onClose: () => void;
}

function defaultStart(date: string): string {
  const now = new Date();
  if (date === toISODate(now)) return `${pad(Math.min(23, now.getHours() + 1))}:00`;
  return '09:00';
}

export default function ActivityForm({ initial, defaultDate, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [startTime, setStartTime] = useState(initial?.startTime ?? defaultStart(defaultDate));
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'none');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [reminder, setReminder] = useState<number | null>(initial ? initial.reminderMinutes : 15);
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
      date,
      startTime,
      endTime: endTime || null,
      priority,
      location: location.trim(),
      notes: notes.trim(),
      reminderMinutes: reminder,
      status,
      source: initial?.source ?? 'typed',
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

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={initial ? 'Editar actividad' : 'Nueva actividad'}
      >
        <h2 className="sheet__title">{initial ? 'Editar actividad' : 'Nueva actividad'}</h2>

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

          <div className="field-row">
            <label className="field">
              <span>Fecha</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">
              <span>Inicio</span>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </label>
            <label className="field">
              <span>Fin (opcional)</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </label>
          </div>

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
              placeholder="Ej.: Oficina, Finca de Juan, Km 12 vía Quito"
            />
          </label>

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
