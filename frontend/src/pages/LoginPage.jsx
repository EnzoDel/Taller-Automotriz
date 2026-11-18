import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await login({ email, password });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase text-sky-700">Taller Automotriz</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Iniciar sesión</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            Correo electrónico
            <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            Contraseña
            <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="w-full rounded bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60" type="submit" disabled={submitting}>
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  );
}