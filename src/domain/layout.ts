import type { Activity } from './activity';
import { toMinutes } from './time';

export interface Block {
  activity: Activity;
  top: number; // % dentro de la barra del día
  height: number; // %
  lane: number; // carril, para actividades que se cruzan
  lanes: number;
}

// Convierte las actividades de un día en bloques de una barra vertical (hora = altura).
// Si dos actividades se cruzan, se dibujan una al lado de la otra.
export function layoutDay(items: Activity[], rangeStart: number, rangeEnd: number): Block[] {
  const total = rangeEnd - rangeStart;
  const sorted = items
    .map((a) => {
      const s = toMinutes(a.startTime);
      let e = a.endTime ? toMinutes(a.endTime) : s + 60;
      if (e <= s) e = s + 60;
      return { a, s, e: Math.max(e, s + 30) }; // alto mínimo visible
    })
    .sort((x, y) => x.s - y.s);

  const out: Block[] = [];
  let cluster: { a: Activity; s: number; e: number; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const lanes = laneEnds.length;
    cluster.forEach((c) => {
      const s = Math.max(c.s, rangeStart);
      const e = Math.min(c.e, rangeEnd);
      out.push({
        activity: c.a,
        top: ((s - rangeStart) / total) * 100,
        height: Math.max(((e - s) / total) * 100, 1.5),
        lane: c.lane,
        lanes,
      });
    });
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };

  for (const { a, s, e } of sorted) {
    if (cluster.length > 0 && s >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e);
    } else {
      laneEnds[lane] = e;
    }
    cluster.push({ a, s, e, lane });
    clusterEnd = Math.max(clusterEnd, e);
  }
  if (cluster.length > 0) flush();
  return out;
}
