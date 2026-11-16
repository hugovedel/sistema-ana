'use client';

import { useEffect, useState } from 'react';
import { TODOS_LOS_ETFS } from '@/lib/etfs';
import { fechaChicago } from '@/lib/reloj';

const CAPITAL_INICIAL = 500; // tope del experimento
const REVISION = 250;        // si el capital baja de aquí, revisión obligatoria

interface Fila {
  id: string;
  fecha_compra: string;
  etf: string;
  monto_compra: number;
  fecha_venta: string | null;
  monto_venta: number | null;
  estado: 'abierta' | 'cerrada';
  mantuve: boolean;
  decision: string;
  ia_seguida: string | null;
  comisiones: number;
  notas: string | null;
  precio_ref?: number | null;
  precio_compra?: number | null;
  precio_venta?: number | null;
}

const TXT_DECISION: Record<string, string> = {
  segui_veredicto: 'Seguí el veredicto',
  segui_ia: 'Seguí a una IA',
  mia: 'Decisión mía'
};

const dias = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

const usd = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;

function ganancia(f: Fila) {
  return f.estado === 'cerrada' && f.monto_venta !== null
    ? Number(f.monto_venta) - Number(f.monto_compra) - Number(f.comisiones || 0)
    : 0;
}

function Grafica({ puntos }: { puntos: number[] }) {
  const W = 640, H = 170, P = 28;
  const todos = [CAPITAL_INICIAL, REVISION, ...puntos];
  const min = Math.min(...todos) - 20;
  const max = Math.max(...todos) + 20;
  const x = (i: number) => P + (puntos.length <= 1 ? 0 : (i * (W - 2 * P)) / (puntos.length - 1));
  const y = (v: number) => H - P - ((v - min) / (max - min)) * (H - 2 * P);
  const linea = puntos.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <line x1={P} x2={W - P} y1={y(CAPITAL_INICIAL)} y2={y(CAPITAL_INICIAL)} stroke="#9ca3af" strokeDasharray="4 4" />
      <text x={W - P} y={y(CAPITAL_INICIAL) - 4} fontSize="10" fill="#6b7280" textAnchor="end">$500 inicial</text>
      <line x1={P} x2={W - P} y1={y(REVISION)} y2={y(REVISION)} stroke="#ef4444" strokeDasharray="4 4" />
      <text x={W - P} y={y(REVISION) - 4} fontSize="10" fill="#ef4444" textAnchor="end">$250 revisión</text>
      {puntos.length > 1 && <polyline points={linea} fill="none" stroke="#111827" strokeWidth="2" />}
      {puntos.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#111827" />)}
    </svg>
  );
}

export default function Diario({ token }: { token: string }) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const hoy = fechaChicago();

  // Formulario de compra
  const [fecha, setFecha] = useState(hoy);
  const [etf, setEtf] = useState('');
  const [monto, setMonto] = useState('');
  const [decision, setDecision] = useState('segui_veredicto');
  const [ia, setIa] = useState('claude');
  const [comisiones, setComisiones] = useState('');
  const [pRef, setPRef] = useState('');
  const [pCompra, setPCompra] = useState('');
  const [notas, setNotas] = useState('');

  // Formulario de venta por fila
  const [venta, setVenta] = useState<Record<string, { monto: string; fecha: string; precio?: string }>>({});

  const h = { 'Content-Type': 'application/json', authorization: `Bearer ${token}` };

  const cargar = async () => {
    try {
      const r = await fetch('/api/diario', { headers: { authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.error) setError(d.error); else { setFilas(d.filas || []); setError(''); }
    } catch { setError('Error de conexión'); }
    finally { setCargando(false); }
  };
  useEffect(() => { cargar(); }, []);

  const enviar = async (metodo: string, cuerpo: object, url = '/api/diario'): Promise<boolean> => {
    const r = await fetch(url, { method: metodo, headers: h, body: metodo === 'DELETE' ? undefined : JSON.stringify(cuerpo) });
    const d = await r.json();
    if (d.yaAbierta) {
      if (window.confirm(`${d.error}\n\n¿Registrarla de todos modos?`)) return enviar(metodo, { ...cuerpo, forzar: true }, url);
      setError('');
      return false;
    }
    if (d.error) { setError(d.error); return false; }
    setError('');
    await cargar();
    return true;
  };

  const guardarCompra = async () => {
    const cuerpo = {
      fecha_compra: fecha, etf, monto_compra: monto, decision, ia_seguida: ia, comisiones, notas,
      precio_ref: pRef, precio_compra: pCompra
    };
    const ok = await enviar('POST', cuerpo);
    if (ok) { setEtf(''); setMonto(''); setComisiones(''); setNotas(''); setPRef(''); setPCompra(''); }
  };

  const registrarVenta = async (f: Fila) => {
    const v = venta[f.id] || { monto: '', fecha: hoy };
    await enviar('PATCH', { id: f.id, monto_venta: v.monto, fecha_venta: v.fecha || hoy, precio_venta: v.precio });
  };

  const borrar = async (f: Fila) => {
    if (!window.confirm(`¿Borrar la operación de ${f.etf} del ${f.fecha_compra}? No se puede deshacer.`)) return;
    await enviar('DELETE', {}, `/api/diario?id=${f.id}`);
  };

  // Resumen
  const cerradas = filas.filter(f => f.estado === 'cerrada').sort((a, b) => (a.fecha_venta! > b.fecha_venta! ? 1 : -1));
  const abiertas = filas.filter(f => f.estado === 'abierta');
  const gananciaTotal = cerradas.reduce((a, f) => a + ganancia(f), 0);
  const capital = CAPITAL_INICIAL + gananciaTotal;
  const enJuego = abiertas.reduce((a, f) => a + Number(f.monto_compra), 0);
  let acum = CAPITAL_INICIAL;
  const puntos = [CAPITAL_INICIAL, ...cerradas.map(f => (acum += ganancia(f)))];
  const bajoRevision = capital <= REVISION;

  const caja = 'bg-white border border-[#e5e7eb] rounded-xl p-4';
  const input = 'px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg outline-none focus:border-[#111827] w-full';

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-base font-semibold text-[#111827] mb-1">Diario de operaciones</h2>
        <p className="text-sm text-[#6b7280]">Anota lo que compras, lo que cobras y qué decisión tomaste.</p>
      </div>

      {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className={caja}><div className="text-xs text-[#6b7280]">Capital actual</div><div className={`font-mono text-lg font-semibold ${bajoRevision ? 'text-red-500' : 'text-[#111827]'}`}>{usd(capital)}</div></div>
        <div className={caja}><div className="text-xs text-[#6b7280]">Ganancia realizada</div><div className={`font-mono text-lg font-semibold ${gananciaTotal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{usd(gananciaTotal)} <span className="text-xs">({((gananciaTotal / CAPITAL_INICIAL) * 100).toFixed(1)}%)</span></div></div>
        <div className={caja}><div className="text-xs text-[#6b7280]">En juego ahora</div><div className="font-mono text-lg font-semibold text-[#111827]">{usd(enJuego)}</div></div>
        <div className={caja}><div className="text-xs text-[#6b7280]">Meta (+100%)</div><div className="font-mono text-lg font-semibold text-[#111827]">{usd(CAPITAL_INICIAL * 2)}</div></div>
      </div>

      {bajoRevision && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-4">
          El capital llegó a $250 o menos. Es el punto de revisión obligatoria: detente y revisa antes de seguir.
        </div>
      )}

      <div className={`${caja} mb-6`}>
        <div className="text-xs font-medium text-[#374151] mb-2">Capital con cada operación cerrada</div>
        <Grafica puntos={puntos} />
      </div>

      <div className={`${caja} mb-6`}>
        <div className="text-sm font-medium text-[#111827] mb-3">Registrar compra</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div><div className="text-xs text-[#6b7280] mb-1">Fecha de compra</div><input type="date" className={input} value={fecha} onChange={e => setFecha(e.target.value)} /></div>
          <div><div className="text-xs text-[#6b7280] mb-1">ETF</div><input list="etfs" className={`${input} font-mono uppercase`} value={etf} onChange={e => setEtf(e.target.value)} placeholder="TQQQ" /><datalist id="etfs">{TODOS_LOS_ETFS.map(t => <option key={t} value={t} />)}</datalist></div>
          <div><div className="text-xs text-[#6b7280] mb-1">Dólares invertidos</div><input type="number" min="0" step="0.01" className={input} value={monto} onChange={e => setMonto(e.target.value)} placeholder="100" /></div>
          <div><div className="text-xs text-[#6b7280] mb-1">Comisiones (opcional)</div><input type="number" min="0" step="0.01" className={input} value={comisiones} onChange={e => setComisiones(e.target.value)} /></div>
          <div><div className="text-xs text-[#6b7280] mb-1">Precio de referencia (opcional)</div><input type="number" min="0" step="0.0001" className={input} value={pRef} onChange={e => setPRef(e.target.value)} placeholder="el del diagnóstico" /></div>
          <div><div className="text-xs text-[#6b7280] mb-1">Precio real de compra (opcional)</div><input type="number" min="0" step="0.0001" className={input} value={pCompra} onChange={e => setPCompra(e.target.value)} /></div>
          <div className="md:col-span-2"><div className="text-xs text-[#6b7280] mb-1">¿Qué decisión tomaste?</div>
            <select className={input} value={decision} onChange={e => setDecision(e.target.value)}>
              <option value="segui_veredicto">Seguí el veredicto de las IAs</option>
              <option value="segui_ia">Seguí a una IA en particular</option>
              <option value="mia">Decisión mía</option>
            </select></div>
          {decision === 'segui_ia' && (
            <div><div className="text-xs text-[#6b7280] mb-1">¿A cuál?</div>
              <select className={input} value={ia} onChange={e => setIa(e.target.value)}>
                <option value="claude">Claude</option><option value="gpt">GPT-4o</option><option value="gemini">Gemini</option><option value="grok">Grok</option>
              </select></div>
          )}
          <div className="md:col-span-4"><div className="text-xs text-[#6b7280] mb-1">Notas (opcional)</div><input className={input} value={notas} onChange={e => setNotas(e.target.value)} /></div>
        </div>
        <button onClick={guardarCompra} disabled={!etf || !monto} className="px-4 py-2 text-sm font-medium bg-[#111827] text-white rounded-lg hover:bg-[#1f2937] disabled:opacity-50 transition-colors">Guardar compra</button>
      </div>

      {cargando ? (
        <div className="text-sm text-[#6b7280]">Cargando...</div>
      ) : filas.length === 0 ? (
        <div className="text-center py-8 text-sm text-[#6b7280]">Todavía no hay operaciones.</div>
      ) : (
        <div className="space-y-3">
          {filas.map(f => {
            const g = ganancia(f);
            const diasMant = f.estado === 'cerrada' && f.fecha_venta ? dias(f.fecha_compra, f.fecha_venta) : dias(f.fecha_compra, hoy);
            const v = venta[f.id] || { monto: '', fecha: hoy };
            return (
              <div key={f.id} className={caja}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-[#111827]">{f.etf}</span>
                    <span className="text-xs text-[#6b7280]">{f.fecha_compra}{f.fecha_venta ? ` → ${f.fecha_venta}` : ''}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${f.estado === 'abierta' ? 'bg-amber-50 text-amber-700' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>{f.estado === 'abierta' ? 'Abierta' : 'Cerrada'}</span>
                    {(f.mantuve || diasMant > 1) && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700">Mantuve ({diasMant} días)</span>}
                  </div>
                  <div className="font-mono text-sm">
                    {usd(Number(f.monto_compra))}{f.monto_venta !== null && <> → {usd(Number(f.monto_venta))} <span className={g >= 0 ? 'text-emerald-600' : 'text-red-500'}>({usd(g)})</span></>}
                  </div>
                </div>
                <div className="text-xs text-[#6b7280] mt-1">{TXT_DECISION[f.decision] || f.decision}{f.ia_seguida ? ` (${f.ia_seguida})` : ''}{Number(f.comisiones) > 0 ? ` · comisiones ${usd(Number(f.comisiones))}` : ''}{f.notas ? ` · ${f.notas}` : ''}{f.precio_ref && f.precio_compra ? ` · slippage de compra ${(((Number(f.precio_compra) - Number(f.precio_ref)) / Number(f.precio_ref)) * 100).toFixed(2)}% (ref ${f.precio_ref} → real ${f.precio_compra})` : ''}{f.precio_venta ? ` · vendido a ${f.precio_venta}` : ''}</div>
                {f.estado === 'abierta' && (
                  <div className="flex flex-wrap items-end gap-2 mt-3">
                    <div><div className="text-xs text-[#6b7280] mb-1">Dólares cobrados</div><input type="number" min="0" step="0.01" className={`${input} w-32`} value={v.monto} onChange={e => setVenta({ ...venta, [f.id]: { ...v, monto: e.target.value } })} /></div>
                    <div><div className="text-xs text-[#6b7280] mb-1">Fecha de venta</div><input type="date" className={`${input} w-40`} value={v.fecha} onChange={e => setVenta({ ...venta, [f.id]: { ...v, fecha: e.target.value } })} /></div>
                    <div><div className="text-xs text-[#6b7280] mb-1">Precio de venta</div><input type="number" min="0" step="0.0001" className={`${input} w-28`} value={v.precio || ''} onChange={e => setVenta({ ...venta, [f.id]: { ...v, precio: e.target.value } })} /></div>
                    <button onClick={() => registrarVenta(f)} disabled={v.monto === ''} className="px-3 py-2 text-sm font-medium border border-[#e5e7eb] rounded-lg hover:bg-[#f9f9f8] disabled:opacity-50">Registrar venta</button>
                    {!f.mantuve && <button onClick={() => enviar('PATCH', { id: f.id, mantuve: true })} className="px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg hover:bg-[#f9f9f8]">Marcar: mantuve</button>}
                  </div>
                )}
                <button onClick={() => borrar(f)} className="text-xs text-[#9ca3af] hover:text-red-500 mt-3">Borrar</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
