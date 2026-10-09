import { useState, type FormEvent } from 'react';
import { supabase } from '../../data/supabase';

function translate(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (message.includes('at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (message.includes('already registered')) return 'Ese correo ya tiene cuenta. Inicia sesión.';
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Sin conexión. Para entrar por primera vez necesitas internet.';
  }
  return message;
}

// Pantalla de entrada: sin sesión no se ve ninguna actividad.
export default function LoginScreen() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
    }
    // Si todo salió bien, la sesión se abre y la app aparece sola.
  }

  return (
    <main className="gate">
      <div className="gate__card">
        <h1 className="gate__title">Calendario</h1>
        <p className="gate__hint">
          {mode === 'in'
            ? 'Tu agenda es privada. Entra con tu correo y contraseña.'
            : 'Crea tu cuenta. Solo tú verás tus actividades.'}
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
    </main>
  );
}
