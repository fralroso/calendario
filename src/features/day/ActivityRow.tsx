import { CATEGORY_LABEL, PRIORITY_LABEL, type Activity } from '../../domain/activity';
import { extractMapLink, locationLabel } from '../../domain/maps';

interface Props {
  activity: Activity;
  isNext: boolean;
  onOpen: () => void;
  onToggle: () => void;
}

export default function ActivityRow({ activity: a, isNext, onOpen, onToggle }: Props) {
  const off = a.status !== 'pending';
  const done = a.status === 'done';
  const mapLink = extractMapLink(a.location);
  const hasMeta = isNext || a.category !== 'other' || a.priority !== 'none' || a.location !== '' || a.status === 'cancelled';

  return (
    <li className={`row${off ? ' row--off' : ''}${isNext ? ' row--next' : ''}${mapLink ? ' row--map' : ''}`}>
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
              {a.category !== 'other' && <span>{CATEGORY_LABEL[a.category]}</span>}
              {a.priority !== 'none' && <span>{PRIORITY_LABEL[a.priority]}</span>}
              {a.location && <span>{locationLabel(a.location)}</span>}
              {a.status === 'cancelled' && <span>Cancelada</span>}
            </span>
          )}
        </span>
      </button>

      {mapLink && (
        <a
          className="mapbtn"
          href={mapLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir la ubicación en el mapa"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="10" r="2.4" fill="currentColor" />
          </svg>
        </a>
      )}

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
