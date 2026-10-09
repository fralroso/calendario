import { useEffect } from 'react';
import { startSync } from '../data/sync';
import DayView from '../features/day/DayView';

// Por ahora la app tiene una sola pantalla. Cuando llegue la vista semanal
// se agrega aquí la navegación entre vistas.
export default function App() {
  useEffect(() => startSync(), []);
  return <DayView />;
}
