'use client';

import { useState, useEffect } from 'react';

interface Analisis {
  id: string;
  fecha: string;
  ticker: string;
  precio_cierre: number;
  probabilidad_rebote_final: number;
  precio_objetivo: number;
  stop_loss: number;
  razon_final: string;
  resultado: string;
  porcentaje_cambio: number;
  sentimiento_mercado: string;
  rsi: number;
  tendencia: string;
}

interface Estadisticas {
  total: number;
  calificados: number;
  correctos: number;
  incorrectos: number;
  precision: number;
}

export default function Historial({ token }: { token: string }) {
  const [analisis, setAnalisis] = useState<Analisis[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [calificando, setCalificando] = useState(false);

  const cargarHistorial = async () => {
    try {
      const r = await fetch('/api/historial', {
        headers: { authorization: `Bearer ${token}` }
      });
      const data = await r.json();
      setAnalisis(data.analisis || []);
      setEstadisticas(data.estadisticas);
    } catch (e) {
      console.error('Error cargando historial:', e);
    } finally {
      setCargando(false);
    }
  };

  const calificarPredicciones = async () => {
    setCalificando(true);
    try {
      const r = await fetch('/api/calificar', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` }
      });
      const data = await r.json();
      alert(data.mensaje);
      cargarHistorial();
    } catch {
      alert('Error calificando predicciones');
    } finally {
      setCalificando(false);
    }
  };

  useEffect(() => { cargarHistorial(); }, []);

  if (cargando) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-[#6b7280]">Cargando historial...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-[#111827] mb-1">Historial de predicciones</h2>
          <p className="text-sm text-[#6b7280]">Registro completo de análisis y su precisión.</p>
        </div>
        <button
          onClick={calificarPredicciones}
          disabled={calificando}
          className="px-4 py-2 text-sm font-medium border border-[#e5e7eb] rounded-lg hover:bg-[#f9f9f8] disabled:opacity-50 transition-colors"
        >
          {calificando ? 'Calificando...' : 'Calificar predicciones'}
        </button>
      </div>

      {estadisticas && estadisticas.calificados > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total análisis', value: estadisticas.total },
            { label: 'Correctos', value: estadisticas.correctos, color: 'text-emerald-600' },
            { label: 'Incorrectos', value: estadisticas.incorrectos, color: 'text-red-500' },
            { label: 'Precisión', value: `${estadisticas.precision}%`, color: estadisticas.precision >= 60 ? 'text-emerald-600' : 'text-red-500' }
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-[#e5e7eb] rounded-xl p-4">
              <div className="text-xs text-[#6b7280] mb-1">{label}</div>
              <div className={`font-mono text-xl font-semibold ${color || 'text-[#111827]'}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {analisis.length === 0 ? (
        <div className="text-center py-12 text-sm text-[#6b7280]">
          No hay análisis todavía. Empieza analizando algunas acciones.
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                {['Fecha', 'Ticker', 'Precio cierre', 'Probabilidad', 'Objetivo', 'Stop loss', 'Resultado', 'Cambio'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-[#6b7280] px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analisis.map((a, i) => (
                <tr key={a.id} className={`border-b border-[#f3f4f6] hover:bg-[#f9f9f8] transition-colors ${i % 2 === 0 ? '' : 'bg-[#fafafa]'}`}>
                  <td className="px-4 py-3 text-xs text-[#6b7280] font-mono">{a.fecha}</td>
                  <td className="px-4 py-3 text-sm font-mono font-semibold text-[#111827]">{a.ticker}</td>
                  <td className="px-4 py-3 text-sm font-mono text-[#111827]">${a.precio_cierre?.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-sm font-medium ${
                      a.probabilidad_rebote_final >= 70 ? 'text-emerald-600' :
                      a.probabilidad_rebote_final >= 55 ? 'text-amber-600' : 'text-red-500'
                    }`}>{a.probabilidad_rebote_final}%</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-emerald-600">${a.precio_objetivo?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-red-500">${a.stop_loss?.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      a.resultado === 'correcto' ? 'bg-emerald-50 text-emerald-700' :
                      a.resultado === 'incorrecto' ? 'bg-red-50 text-red-700' :
                      'bg-[#f3f4f6] text-[#6b7280]'
                    }`}>
                      {a.resultado === 'pendiente' ? 'Pendiente' : a.resultado === 'correcto' ? 'Correcto' : 'Incorrecto'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {a.porcentaje_cambio != null ? (
                      <span className={a.porcentaje_cambio >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {a.porcentaje_cambio >= 0 ? '+' : ''}{a.porcentaje_cambio}%
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
