export type TabId = 'agenda' | 'tasks';

interface Props {
  tab: TabId;
  onChange: (tab: TabId) => void;
  urgent: number; // pendientes vencidos o que vencen hoy
}

export default function Tabs({ tab, onChange, urgent }: Props) {
  return (
    <nav className="tabs" aria-label="Secciones">
      <button
        type="button"
        className={`tab${tab === 'agenda' ? ' is-on' : ''}`}
        aria-current={tab === 'agenda' ? 'page' : undefined}
        onClick={() => onChange('agenda')}
      >
        Agenda
      </button>
      <button
        type="button"
        className={`tab${tab === 'tasks' ? ' is-on' : ''}`}
        aria-current={tab === 'tasks' ? 'page' : undefined}
        onClick={() => onChange('tasks')}
      >
        Pendientes
        {urgent > 0 && (
          <span className="tab__badge" aria-label={`${urgent} urgentes`}>
            {urgent}
          </span>
        )}
      </button>
    </nav>
  );
}
