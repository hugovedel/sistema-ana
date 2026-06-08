'use client';

import { useState } from 'react';

export default function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async () => {
    setCargando(true);
    setError('');
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await r.json();
      if (data.token) {
        onLogin(data.token);
      } else {
        setError('Contraseña incorrecta');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f8] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">SistemaAna</h1>
          <p className="text-sm text-[#6b7280] mt-1">Análisis predictivo de acciones</p>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-sm">
          <div className="mb-4">
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg outline-none focus:border-[#111827] transition-colors font-mono"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={cargando || !password}
            className="w-full py-2 text-sm font-medium bg-[#111827] text-white rounded-lg hover:bg-[#1f2937] disabled:opacity-50 transition-colors"
          >
            {cargando ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
