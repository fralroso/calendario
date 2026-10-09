import { MONTHS, daysInMonth, pad } from '../domain/time';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
}

// Fecha en orden día / mes / año, igual en cualquier celular o navegador.
export default function DateField({ value, onChange }: Props) {
  const [y, m, d] = value.split('-').map(Number);
  const thisYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = Math.min(thisYear - 1, y); i <= Math.max(thisYear + 3, y); i++) years.push(i);
  const days = Array.from({ length: daysInMonth(y, m) }, (_, i) => i + 1);

  const set = (ny: number, nm: number, nd: number) => {
    const day = Math.min(nd, daysInMonth(ny, nm));
    onChange(`${ny}-${pad(nm)}-${pad(day)}`);
  };

  return (
    <fieldset className="field field--group">
      <legend>Fecha</legend>
      <div className="pair">
        <select aria-label="Día" value={d} onChange={(e) => set(y, m, Number(e.target.value))}>
          {days.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select
          aria-label="Mes"
          className="pair__month"
          value={m}
          onChange={(e) => set(y, Number(e.target.value), d)}
        >
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <select aria-label="Año" value={y} onChange={(e) => set(Number(e.target.value), m, d)}>
          {years.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
