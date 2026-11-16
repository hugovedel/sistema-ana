'use client';

import { useState, useEffect } from 'react';
import { Pastilla } from './TarjetaDiagnostico';

interface Fila {
  id: string;
  fecha: string;
  tema: string;
  ia: string;
  modo: string;
  decision: string;
  etf_elegido: string | null;
  confianza: number;
  resultado: string;
  rendimiento_pct: number | null;
  costo_usd: number;
}

interface Marcador {
  ia: string;
  nombre: string;
  modo: string;
  decisiones: number;
  calificadas: number;
  correctas: number;
  precision: number | null;
  operaciones: number;
  rendimientoPromedio: number | null;
  costoTotal: number;
}

const COLOR_RES: Record<string, string> = {
  correcto: 'bg-emerald-50 text-emerald-700',
  incorrecto: 'bg-red-50 text-red-700',
  oportunidad_perdida: 'bg-amber-50 text-amber-700',
  pendiente: 'bg-[#f3f4f6] text-[#6b7280]'
};

const ETIQUETA_RES: Record<string, string> = {
  correcto: 'Correcto',
  incorrecto: 'Incorrecto',
  oportunidad_perdida: 'Oportunidad perdida',
  pendiente: 'Pendiente'
};

export default function Historial({ token }: { token: string }) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [tablero, setTablero] = useState<Marcador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [calificando, setCalificando] = useState(false);
  const [aviso, setAviso] = useState('');

  const cargar = async () => {
    try {
      const r = await fetch('/api/historial', { headers: { authorization: `Bearer ${token}` } });
      const data = await r.json();
      setFilas(data.filas || []);
      setTablero(data.tablero || []);
    } catch (e) {
      console.error('Error cargando historial:', e);
    } finally {
      setCargando(false);
    }
  };

  const calificar = async () => {
    setCalificando(true);
    setAviso('');
    try {
      const r = await fetch('/api/calificar', { method: 'POST', headers: { authorization: `Bearer ${token}` } });
      const data = await r.json();
      setAviso(data.mensaje || data.error || '');
      cargar();
    } catch {
      setAviso('Error calificando decisiones');
    } finally {
      setCalificando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  if (cargando) {
    return <div className="text-center py-12 text-sm text-[#6b7280]">Cargando historial...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-[#111827] mb-1">Historial y marcador por IA</h2>
          <p className="text-sm text-[#6b7280]">
            Acierto = el ETF elegido abre por encima del umbral (apalancamiento/3 %) sobre el cierre previo.
          </p>
        </div>
        <button
          onClick={calificar}
          disabled={calificando}
          className="px-4 py-2 text-sm font-medium border border-[#e5e7eb] rounded-lg hover:bg-[#f9f9f8] disabled:opacity-50 transition-colors"
        >
          {calificando ? 'Calificando...' : 'Calificar decisiones'}
        </button>
      </div>

      {aviso && <p className="text-xs text-[#6b7280] mb-4">{aviso}</p>}

      <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e5e7eb]">
              {['IA', 'Decisiones', 'Calificadas', 'Precisión', 'Rend. prom. (operadas)', 'Costo'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-[#6b7280] px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tablero.map(m => (
              <tr key={m.ia} className="border-b border-[#f3f4f6]">
                <td className="px-4 py-3 text-sm text-[#111827]">
                  {m.nombre} {m.modo === 'sombra' && <span className="text-[10px] uppercase text-[#9ca3af] ml-1">sombra</span>}
                </td>
                <td className="px-4 py-3 text-sm font-mono">{m.decisiones}</td>
                <td className="px-4 py-3 text-sm font-mono">{m.calificadas}</td>
                <td className="px-4 py-3 text-sm font-mono">{m.precision === null ? '—' : `${m.precision}%`}</td>
                <td className="px-4 py-3 text-sm font-mono">
                  {m.rendimientoPromedio === null ? '—' : `${m.rendimientoPromedio >= 0 ? '+' : ''}${m.rendimientoPromedio}%`}
                </td>
                <td className="px-4 py-3 text-sm font-mono">${m.costoTotal.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filas.length === 0 ? (
        <div className="text-center py-12 text-sm text-[#6b7280]">No hay decisiones todavía. Corre un diagnóstico desde Inicio.</div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                {['Fecha', 'Tema', 'IA', 'Decisión', 'Conf.', 'Resultado', 'Rend.'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-[#6b7280] px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.id} className="border-b border-[#f3f4f6] hover:bg-[#f9f9f8] transition-colors">
                  <td className="px-4 py-3 text-xs text-[#6b7280] font-mono">{f.fecha}</td>
                  <td className="px-4 py-3 text-sm font-mono text-[#111827]">{f.tema}</td>
                  <td className="px-4 py-3 text-sm text-[#374151]">{f.ia}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Pastilla decision={f.decision} />
                      {f.etf_elegido && <span className="font-mono text-xs text-[#6b7280]">{f.etf_elegido}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{f.confianza}%</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${COLOR_RES[f.resultado] || COLOR_RES.pendiente}`}>
                      {ETIQUETA_RES[f.resultado] || f.resultado}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {f.rendimiento_pct != null ? (
                      <span className={Number(f.rendimiento_pct) >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {Number(f.rendimiento_pct) >= 0 ? '+' : ''}{f.rendimiento_pct}%
                      </span>
                    ) : <span className="text-[#9ca3af]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
