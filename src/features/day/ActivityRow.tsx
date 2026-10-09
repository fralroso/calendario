import { PRIORITY_LABEL, type Activity } from '../../domain/activity';

interface Props {
  activity: Activity;
  isNext: boolean;
  onOpen: () => void;
  onToggle: () => void;
}

export default function ActivityRow({ activity: a, isNext, onOpen, onToggle }: Props) {
  const off = a.status !== 'pending';
  const done = a.status === 'done';
  const hasMeta = isNext || a.priority !== 'none' || a.location !== '' || a.status === 'cancelled';

  return (
    <li className={`row${off ? ' row--off' : ''}${isNext ? ' row--next' : ''}`}>
      <div className="row__time">
        <span>{a.startTime}</span>
        {a.endTime && <span className="row__end">{a.endTime}</span>}
      </div>

      <button type="button" className="row__body" onClick={onOpen}>
        <span className={`bar bar--${a.priority}`} aria-hidden="true" />
        <span className="row__text">
          <span className={`row__title${done ? ' is-done' : ''}`}>{a.title}</span>
          {hasMeta && (
            <span className="row__meta">
              {isNext && <span className="flag">Siguiente</span>}
              {a.priority !== 'none' && <span>{PRIORITY_LABEL[a.priority]}</span>}
              {a.location && <span>{a.location}</span>}
              {a.status === 'cancelled' && <span>Cancelada</span>}
            </span>
          )}
        </span>
      </button>

      <button
        type="button"
        className={`check${done ? ' is-on' : ''}`}
        aria-pressed={done}
        aria-label={done ? 'Marcar como pendiente' : 'Marcar como completada'}
        onClick={onToggle}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </li>
  );
}
