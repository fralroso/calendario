import { pad } from '../domain/time';

interface Props {
  label: string;
  value: string; // HH:mm (24 horas); '' si es opcional y está vacío
  onChange: (value: string) => void;
  optional?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

// Hora en formato de 24 horas, igual en cualquier celular o navegador.
export default function TimeField({ label, value, onChange, optional }: Props) {
  const [h, m] = value ? value.split(':') : ['', ''];
  const minutes = m && !MINUTES.includes(m) ? [...MINUTES, m].sort() : MINUTES;

  return (
    <fieldset className="field field--group">
      <legend>{label}</legend>
      <div className="pair">
        <select
          aria-label={`${label}: hora`}
          value={h}
          onChange={(e) => {
            const nh = e.target.value;
            onChange(nh === '' ? '' : `${nh}:${m || '00'}`);
          }}
        >
          {optional && <option value="">--</option>}
          {HOURS.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <span className="pair__sep" aria-hidden="true">
          :
        </span>
        <select
          aria-label={`${label}: minutos`}
          value={m}
          disabled={h === ''}
          onChange={(e) => onChange(`${h}:${e.target.value}`)}
        >
          {h === '' ? (
            <option value="">--</option>
          ) : (
            minutes.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))
          )}
        </select>
      </div>
    </fieldset>
  );
}
