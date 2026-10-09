import { db } from './db';
import { supabase } from './supabase';
import { syncNow } from './sync';

// Cierra la sesión y borra las actividades guardadas en este dispositivo,
// para que la siguiente persona que use el equipo no vea nada ajeno.
// Devuelve false si el usuario decidió no salir.
export async function signOutAndClear(): Promise<boolean> {
  if (!supabase) return false;

  await syncNow(); // intenta respaldar lo pendiente antes de salir
  const pending = await db.activities.where('syncState').equals('pending').count();
  if (pending > 0) {
    const plural = pending === 1 ? 'una actividad sin respaldar' : `${pending} actividades sin respaldar`;
    const ok = window.confirm(
      `Tienes ${plural} (falta internet). Si sales ahora, se perderán. ¿Salir de todas maneras?`,
    );
    if (!ok) return false;
  }

  await supabase.auth.signOut();
  await db.activities.clear();
  Object.keys(localStorage)
    .filter((k) => k.startsWith('calendario:lastPull:'))
    .forEach((k) => localStorage.removeItem(k));
  return true;
}
