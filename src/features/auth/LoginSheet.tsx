import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../data/supabase';

function translate(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (message.includes('at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (message.includes('already registered')) return 'Ese correo ya tiene cuenta. Inicia sesión.';
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Sin conexión. Inténtalo de nuevo cuando tengas internet.';
  }
  return message;
}

export default function LoginSheet({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }
    setBusy(true);
    setError('');
    const creds = { email: email.trim(), password };
    const { data, error: err } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword(creds)
        : await supabase.auth.signUp(creds);
    setBusy(false);

    if (err) {
      setError(translate(err.message));
      return;
    }
    if (mode === 'up' && !data.session) {
      setError('Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
      return;
    }
    onClose();
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Iniciar sesión">
        <h2 className="sheet__title">{mode === 'in' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
        <p className="sheet__hint">
          Con tu cuenta, tus actividades quedan respaldadas y las ves en cualquier dispositivo.
        </p>

        <form onSubmit={submit} noValidate>
          <label className="field">
            <span>Correo</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="actions">
            <button type="button" className="btn" onClick={onClose}>
              Ahora no
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Espera…' : mode === 'in' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </div>

          <button
            type="button"
            className="btn-link btn-link--neutral"
            onClick={() => {
              setMode(mode === 'in' ? 'up' : 'in');
              setError('');
            }}
          >
            {mode === 'in' ? 'No tengo cuenta: crear una' : 'Ya tengo cuenta: iniciar sesión'}
          </button>
        </form>
      </div>
    </>
  );
}
