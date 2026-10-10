interface Props {
  onNew: () => void;
  onQuick: () => void;
}

// Barra inferior: agregar a mano, o escribir / dictar una frase.
export default function FabBar({ onNew, onQuick }: Props) {
  return (
    <div className="fab-wrap">
      <div className="fab-row">
        <button type="button" className="fab fab--ghost" onClick={onQuick}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <rect x="9" y="3" width="6" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Agregar rápido
        </button>
        <button type="button" className="fab" onClick={onNew}>
          + Nueva actividad
        </button>
      </div>
    </div>
  );
}
