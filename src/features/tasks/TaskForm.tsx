import { useEffect, useState, type FormEvent } from 'react';
import DateField from '../../components/DateField';
import { removeTask, saveTask } from '../../data/taskRepository';
import { PRIORITIES, type Priority } from '../../domain/activity';
import { TASK_STATUSES, defaultDue, type Task, type TaskStatus } from '../../domain/task';
import { addDays, toISODate } from '../../domain/time';

interface Props {
  initial: Task | null; // null = pendiente nuevo
  onClose: () => void;
}

const POSTPONE = [
  { label: '+1 día', days: 1 },
  { label: '+3 días', days: 3 },
  { label: '+1 semana', days: 7 },
];

export default function TaskForm({ initial, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? defaultDue(toISODate(new Date())));
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'none');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'pending');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Escribe qué tienes que hacer.');
      return;
    }
    if (!dueDate) {
      setError('Elige la fecha límite.');
      return;
    }
    await saveTask({ title: title.trim(), dueDate, priority, notes: notes.trim(), status }, initial?.id);
    onClose();
  }

  async function onDelete() {
    if (initial && window.confirm('¿Eliminar este pendiente?')) {
      await removeTask(initial.id);
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
        aria-label={initial ? 'Editar pendiente' : 'Nuevo pendiente'}
      >
        <h2 className="sheet__title">{initial ? 'Editar pendiente' : 'Nuevo pendiente'}</h2>

        <form onSubmit={onSubmit} noValidate>
          <label className="field">
            <span>Qué tienes que hacer</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={!initial}
              placeholder="Ej.: Subir el informe"
            />
          </label>

          <DateField label="Fecha límite" value={dueDate} onChange={setDueDate} />

          <div className="choice">
            <span className="choice__label">Postergar la fecha</span>
            <div className="choice__row">
              {POSTPONE.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="chip"
                  onClick={() => setDueDate(addDays(dueDate, p.days))}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="choice">
            <legend>Importancia</legend>
            <div className="choice__row">
              {PRIORITIES.map((p) => (
                <label key={p.value} className={`chip${priority === p.value ? ' is-on' : ''}`}>
                  <input
                    type="radio"
                    name="task-priority"
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
            <span>Notas</span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          {initial && (
            <fieldset className="choice">
              <legend>Estado</legend>
              <div className="choice__row">
                {TASK_STATUSES.map((s) => (
                  <label key={s.value} className={`chip${status === s.value ? ' is-on' : ''}`}>
                    <input
                      type="radio"
                      name="task-status"
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

          <div className="actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              Guardar
            </button>
          </div>

          {initial && (
            <button type="button" className="btn-link" onClick={onDelete}>
              Eliminar pendiente
            </button>
          )}
        </form>
      </div>
    </>
  );
}
