import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../auth';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(identifier.trim(), password);
      nav('/', { replace: true }); // 🔥 avoid stale state
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Login failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold mb-4">Admin Sign in</h1>

        {error && (
          <div className="text-red-600 mb-3">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="email or phone"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />

          <input
            className="w-full border rounded px-3 py-2"
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            className="w-full bg-sky-600 text-white py-2 rounded disabled:opacity-70"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
