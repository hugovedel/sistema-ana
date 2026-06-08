'use client';

import { useState, useEffect } from 'react';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    const tokenGuardado = localStorage.getItem('sistemaana_token');
    if (tokenGuardado) {
      fetch('/api/auth', {
        headers: { authorization: `Bearer ${tokenGuardado}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.valid) setToken(tokenGuardado);
          else localStorage.removeItem('sistemaana_token');
        })
        .finally(() => setVerificando(false));
    } else {
      setVerificando(false);
    }
  }, []);

  const handleLogin = (t: string) => {
    localStorage.setItem('sistemaana_token', t);
    setToken(t);
  };

  const handleLogout = () => {
    localStorage.removeItem('sistemaana_token');
    setToken(null);
  };

  if (verificando) {
    return (
      <div className="min-h-screen bg-[#f9f9f8] flex items-center justify-center">
        <div className="text-sm text-[#6b7280] font-mono">Verificando sesión...</div>
      </div>
    );
  }

  if (!token) return <Login onLogin={handleLogin} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}
