import { useEffect, useState, type FormEvent } from 'react';
import { signOutAndClear } from '../../data/session';
import { supabase } from '../../data/supabase';
import { useSession } from '../auth/useSession';

function translate(message: string): string {
  if (message.includes('at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (message.includes('different') || message.includes('same')) {
    return 'La nueva contraseña debe ser distinta a la actual.';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Sin conexión. Inténtalo de nuevo con internet.';
  }
  return message;
}

export default function AccountSheet({ onClose }: { onClose: () => void }) {
  const { session } = useSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setDone(false);
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirm) return setError('Las dos contraseñas no coinciden.');
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(translate(err.message));
    setPassword('');
    setConfirm('');
    setDone(true);
  }

  async function leave() {
    const left = await signOutAndClear();
    if (left) onClose();
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Mi cuenta">
        <h2 className="sheet__title">Mi cuenta</h2>
        <p className="sheet__hint">{session?.user.email}</p>

        <form onSubmit={changePassword} noValidate>
          <label className="field">
            <span>Nueva contraseña</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Repite la nueva contraseña</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {done && <p className="ok">Contraseña cambiada.</p>}

          <div className="actions">
            <button type="button" className="btn" onClick={onClose}>
              Cerrar
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>

        <button type="button" className="btn-link" onClick={leave}>
          Cerrar sesión
        </button>
      </div>
    </>
  );
}
