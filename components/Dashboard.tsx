'use client';

import { useState } from 'react';
import Analizador from './Analizador';
import Historial from './Historial';

export default function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [vista, setVista] = useState<'analizar' | 'historial'>('analizar');

  return (
    <div className="min-h-screen bg-[#f9f9f8]">
      <header className="bg-white border-b border-[#e5e7eb]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-base font-semibold text-[#111827] tracking-tight">SistemaAna</h1>
            <nav className="flex gap-1">
              <button
                onClick={() => setVista('analizar')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  vista === 'analizar'
                    ? 'bg-[#f3f4f6] text-[#111827] font-medium'
                    : 'text-[#6b7280] hover:text-[#111827]'
                }`}
              >
                Analizar
              </button>
              <button
                onClick={() => setVista('historial')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  vista === 'historial'
                    ? 'bg-[#f3f4f6] text-[#111827] font-medium'
                    : 'text-[#6b7280] hover:text-[#111827]'
                }`}
              >
                Historial
              </button>
            </nav>
          </div>
          <button
            onClick={onLogout}
            className="text-xs text-[#6b7280] hover:text-[#111827] transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {vista === 'analizar' ? <Analizador token={token} /> : <Historial token={token} />}
      </main>
    </div>
  );
}
