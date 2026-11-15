'use client';

import { useState } from 'react';

export interface IAResp {
  ia: string;
  nombre: string;
  modo: 'activa' | 'sombra';
  decision: 'alcista' | 'inverso' | 'no_operar';
  confianza: number;
  razon: string;
  tokens_in: number;
  tokens_out: number;
  costo_usd: number;
  error?: string;
}

export interface Diagnostico {
  tema: string;
  titulo: string;
  modo: 'etf' | 'accion';
  consenso: { decision: 'alcista' | 'inverso' | 'no_operar'; etf: string | null; votos: Record<string, number> };
  ias: IAResp[];
  costoTotal: number;
  error?: string;
}

const COLOR: Record<string, string> = {
  alcista: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inverso: 'bg-red-50 text-red-700 border-red-200',
  no_operar: 'bg-[#f3f4f6] text-[#6b7280] border-[#e5e7eb]'
};

const ETIQUETA: Record<string, string> = {
  alcista: 'Alcista',
  inverso: 'Inverso',
  no_operar: 'No operar'
};

export function Pastilla({ decision }: { decision: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${COLOR[decision] || COLOR.no_operar}`}>
      {ETIQUETA[decision] || decision}
    </span>
  );
}

export default function TarjetaDiagnostico({ d }: { d: Diagnostico }) {
  const [abierto, setAbierto] = useState(false);

  if (d.error) {
    return (
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex items-center justify-between">
        <span className="font-semibold text-[#111827]">{d.titulo}</span>
        <span className="text-xs text-red-500">{d.error}</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-semibold text-[#111827]">{d.titulo}</div>
            <div className="text-xs text-[#6b7280]">Costo del diagnóstico: ${d.costoTotal.toFixed(4)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#6b7280] mb-1">Veredicto (mayoría de 3 IAs)</div>
            <div className="flex items-center gap-2 justify-end">
              <Pastilla decision={d.consenso.decision} />
              {d.consenso.etf && <span className="font-mono font-semibold text-[#111827]">{d.consenso.etf}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {d.ias.map(r => (
            <div key={r.ia} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-[#374151]">{r.nombre}</span>
                {r.modo === 'sombra' && (
                  <span className="text-[10px] uppercase tracking-wide text-[#9ca3af] border border-[#e5e7eb] rounded px-1">sombra</span>
                )}
              </div>
              {r.error ? (
                <span className="text-xs text-red-500">Error</span>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#6b7280]">{r.confianza}%</span>
                  <Pastilla decision={r.decision} />
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => setAbierto(!abierto)}
          className="mt-4 text-xs text-[#6b7280] hover:text-[#111827] transition-colors"
        >
          {abierto ? 'Ocultar' : 'Ver'} razones, tokens y costo
        </button>
      </div>

      {abierto && (
        <div className="border-t border-[#e5e7eb] p-5 space-y-4">
          {d.ias.map(r => (
            <div key={r.ia}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[#374151]">{r.nombre}</span>
                <span className="font-mono text-xs text-[#9ca3af]">
                  {r.tokens_in}+{r.tokens_out} tokens · ${r.costo_usd.toFixed(4)}
                </span>
              </div>
              <p className="text-xs text-[#6b7280] leading-relaxed">{r.error ? `Error: ${r.error}` : r.razon}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
