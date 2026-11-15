'use client';

import { useState } from 'react';
import TarjetaDiagnostico, { Diagnostico } from './TarjetaDiagnostico';
import { pedirDiagnostico } from '@/lib/cliente';

export default function Analizador({ token }: { token: string }) {
  const [tickers, setTickers] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultados, setResultados] = useState<Diagnostico[]>([]);
  const [error, setError] = useState('');

  const analizar = async () => {
    const lista = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    if (lista.length === 0) return;
    if (lista.length > 3) { setError('Máximo 3 acciones'); return; }

    setCargando(true);
    setError('');
    setResultados([]);

    for (const t of lista) {
      try {
        const res = await pedirDiagnostico(token, { ticker: t });
        const data: any = res.data;
        setResultados(prev => [...prev, !res.ok || data.error ? ({ tema: t, titulo: t, error: data.error || 'Error' } as Diagnostico) : data]);
      } catch {
        setResultados(prev => [...prev, { tema: t, titulo: t, error: 'Error de conexión' } as Diagnostico]);
      }
    }
    setCargando(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-base font-semibold text-[#111827] mb-1">Acciones sueltas</h2>
        <p className="text-sm text-[#6b7280]">Hasta 3 tickers separados por coma. Cada IA decide entre comprar o no operar.</p>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={tickers}
            onChange={e => setTickers(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && analizar()}
            placeholder="AAPL, NVDA, TSLA"
            className="flex-1 px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg outline-none focus:border-[#111827] transition-colors font-mono uppercase"
          />
          <button
            onClick={analizar}
            disabled={cargando || !tickers.trim()}
            className="px-4 py-2 text-sm font-medium bg-[#111827] text-white rounded-lg hover:bg-[#1f2937] disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {cargando ? 'Analizando...' : 'Analizar'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      <div className="space-y-4">
        {resultados.map(r => <TarjetaDiagnostico key={r.tema} d={r} />)}
      </div>
    </div>
  );
}
