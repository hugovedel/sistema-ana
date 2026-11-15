'use client';

import { useEffect, useState } from 'react';
import { TEMAS } from '@/lib/etfs';
import { estadoMercado, formatearCuenta } from '@/lib/reloj';
import TarjetaDiagnostico, { Diagnostico } from './TarjetaDiagnostico';
import { pedirDiagnostico } from '@/lib/cliente';

interface DatosETF {
  precio: number;
  cambioDia: number;
  rsi: number;
  tendencia: string;
  volumenRelativo: number;
}

function TarjetaETF({ ticker, etiqueta, d }: { ticker: string; etiqueta: string; d: DatosETF | null | undefined }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono font-semibold text-[#111827]">{ticker}</span>
        <span className="text-[10px] uppercase tracking-wide text-[#9ca3af]">{etiqueta}</span>
      </div>
      {d ? (
        <>
          <div className="font-mono text-lg text-[#111827]">${d.precio.toFixed(2)}</div>
          <div className={`font-mono text-xs mb-3 ${d.cambioDia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {d.cambioDia >= 0 ? '+' : ''}{d.cambioDia.toFixed(2)}%
          </div>
          <div className="grid grid-cols-3 gap-1 text-center">
            <div>
              <div className="text-[10px] text-[#9ca3af]">RSI</div>
              <div className={`font-mono text-xs ${d.rsi < 30 ? 'text-emerald-600' : d.rsi > 70 ? 'text-red-500' : 'text-[#111827]'}`}>{d.rsi.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#9ca3af]">5d</div>
              <div className={`text-xs ${d.tendencia === 'ALZA' ? 'text-emerald-600' : 'text-red-500'}`}>{d.tendencia}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#9ca3af]">Vol</div>
              <div className="font-mono text-xs text-[#111827]">{d.volumenRelativo}x</div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-xs text-[#9ca3af] py-4">Sin datos</div>
      )}
    </div>
  );
}

export default function Inicio({ token }: { token: string }) {
  const [etfs, setEtfs] = useState<Record<string, DatosETF | null>>({});
  const [sentimiento, setSentimiento] = useState<any>(null);
  const [reloj, setReloj] = useState(() => estadoMercado());
  const [resultados, setResultados] = useState<Diagnostico[]>([]);
  const [progreso, setProgreso] = useState<string>('');
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = setInterval(() => setReloj(estadoMercado()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch('/api/mercado', { headers: { authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setEtfs(data.etfs || {});
        setSentimiento(data.sentimiento);
      })
      .catch(() => setError('No se pudieron cargar los datos del mercado'));
  }, [token]);

  const diagnosticar = async () => {
    setDiagnosticando(true);
    setError('');
    setResultados([]);

    for (const t of TEMAS) {
      setProgreso(`Consultando a las IAs: ${t.nombre}...`);
      try {
        const res = await pedirDiagnostico(token, { tema: t.id });
        const data: any = res.data;
        if (!res.ok || data.error) {
          setResultados(prev => [...prev, { tema: t.id, titulo: t.nombre, error: data.error || 'Error' } as Diagnostico]);
        } else {
          setResultados(prev => [...prev, data]);
        }
      } catch {
        setResultados(prev => [...prev, { tema: t.id, titulo: t.nombre, error: 'Error de conexión' } as Diagnostico]);
      }
    }

    setProgreso('');
    setDiagnosticando(false);
  };

  const costoTotal = resultados.reduce((a, r) => a + (r.costoTotal || 0), 0);

  return (
    <div>
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 mb-6 flex flex-wrap items-center gap-6">
        <div>
          <div className="text-xs text-[#6b7280]">Mercado (Chicago)</div>
          <div className={`text-sm font-medium ${reloj.abierto ? 'text-emerald-600' : 'text-[#6b7280]'}`}>
            {reloj.abierto ? 'Abierto' : 'Cerrado'}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#6b7280]">{reloj.abierto ? 'Cierra en (3:00pm)' : 'Abre en (8:30am)'}</div>
          <div className="font-mono text-sm text-[#111827]">{formatearCuenta(reloj.segundos)}</div>
        </div>
        {sentimiento && (
          <>
            <div>
              <div className="text-xs text-[#6b7280]">SPY</div>
              <div className={`font-mono text-sm ${sentimiento.spy >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {sentimiento.spy >= 0 ? '+' : ''}{sentimiento.spy}%
              </div>
            </div>
            <div>
              <div className="text-xs text-[#6b7280]">VIX</div>
              <div className={`font-mono text-sm ${sentimiento.vix > 25 ? 'text-red-500' : 'text-[#111827]'}`}>{sentimiento.vix}</div>
            </div>
          </>
        )}
        <div className="ml-auto flex items-center gap-3">
          {progreso && <span className="text-xs text-[#6b7280]">{progreso}</span>}
          <button
            onClick={diagnosticar}
            disabled={diagnosticando}
            className="px-4 py-2 text-sm font-medium bg-[#111827] text-white rounded-lg hover:bg-[#1f2937] disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {diagnosticando ? 'Diagnosticando...' : 'Diagnosticar'}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

      <div className="space-y-5 mb-8">
        {TEMAS.map(t => (
          <div key={t.id}>
            <div className="text-xs font-medium text-[#374151] mb-2">
              {t.nombre} <span className="text-[#9ca3af]">· {t.apalancamiento}x</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TarjetaETF ticker={t.alcista} etiqueta="alcista" d={etfs[t.alcista]} />
              <TarjetaETF ticker={t.inverso} etiqueta="inverso" d={etfs[t.inverso]} />
            </div>
          </div>
        ))}
      </div>

      {resultados.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#111827]">Diagnóstico</h2>
            <span className="text-xs text-[#6b7280]">Costo total: ${costoTotal.toFixed(4)}</span>
          </div>
          <div className="space-y-4">
            {resultados.map(r => <TarjetaDiagnostico key={r.tema} d={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}
