import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { supabase } from '../../data/supabase';
import { syncErrorStore } from '../../data/sync';
import AccountSheet from '../account/AccountSheet';
import { useSession } from '../auth/useSession';

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export default function SyncStatus() {
  const { session, ready } = useSession();
  const online = useOnline();
  const [accountOpen, setAccountOpen] = useState(false);
  const pending = useLiveQuery(
    async () =>
      (await db.activities.where('syncState').equals('pending').count()) +
      (await db.tasks.where('syncState').equals('pending').count()),
    [],
    0,
  );
  const error = useSyncExternalStore(syncErrorStore.subscribe, syncErrorStore.getSnapshot);

  if (!supabase) return <p className="sync">Solo en este dispositivo</p>;
  if (!ready || !session) return null;

  const text = error
    ? 'No se pudo sincronizar; se reintentará'
    : pending > 0
      ? online
        ? `Subiendo ${pending}…`
        : `Sin conexión: ${pending} por subir`
      : online
        ? 'Todo respaldado'
        : 'Sin conexión';

  return (
    <>
      <p className={`sync${error ? ' sync--error' : ''}`}>
        {text}{' '}
        <button type="button" className="sync__out" onClick={() => setAccountOpen(true)}>
          Cuenta
        </button>
      </p>
      {accountOpen && <AccountSheet onClose={() => setAccountOpen(false)} />}
    </>
  );
}
