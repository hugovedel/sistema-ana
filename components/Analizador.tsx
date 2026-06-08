'use client';

import { useState } from 'react';

interface VeredictoIA {
  probabilidad: number;
  precioObjetivo: number;
  stopLoss: number;
  razon: string;
}

interface Resultado {
  ticker: string;
  nombre?: string;
  precioActual?: number;
  cambioDia?: number;
  error?: string;
  indicadores?: {
    rsi: number;
    macd: number;
    sma20: number;
    sma50: number;
    tendencia: string;
    volumenRelativo: number;
  };
  analisis?: {
    claude: VeredictoIA;
    gemini: VeredictoIA;
    gpt: VeredictoIA;
    final: VeredictoIA & { confianza: string };
  };
}

function ColorConfianza({ confianza }: { confianza: string }) {
  const colores: Record<string, string> = {
    ALTA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MEDIA: 'bg-amber-50 text-amber-700 border-amber-200',
    BAJA: 'bg-red-50 text-red-700 border-red-200'
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colores[confianza] || colores.BAJA}`}>
      Confianza {confianza}
    </span>
  );
}

function BarraProbabilidad({ valor, label }: { valor: number; label: string }) {
  const color = valor >= 70 ? 'bg-emerald-500' : valor >= 55 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#6b7280] w-16 shrink-0">{label}</span>
      <div className="flex-1 bg-[#f3f4f6] rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${valor}%` }} />
      </div>
      <span className="text-xs font-mono font-medium text-[#111827] w-10 text-right">{valor}%</span>
    </div>
  );
}

function TarjetaResultado({ r }: { r: Resultado }) {
  const [expandido, setExpandido] = useState(false);

  if (r.error) {
    return (
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
        <div className="flex items-center justify-between">
          <span className="font-mono font-semibold text-[#111827]">{r.ticker}</span>
          <span className="text-xs text-red-500">{r.error}</span>
        </div>
      </div>
    );
  }

  const { analisis, indicadores } = r;
  if (!analisis || !indicadores) return null;

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono font-semibold text-[#111827] text-lg">{r.ticker}</span>
              <ColorConfianza confianza={analisis.final.confianza} />
            </div>
            <span className="text-xs text-[#6b7280]">{r.nombre}</span>
          </div>
          <div className="text-right">
            <div className="font-mono font-semibold text-[#111827]">${r.precioActual?.toFixed(2)}</div>
            <div className={`text-xs font-mono ${(r.cambioDia || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {(r.cambioDia || 0) >= 0 ? '+' : ''}{r.cambioDia?.toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs font-medium text-[#374151] mb-2">Probabilidad de rebote</div>
          <div className="space-y-2">
            <BarraProbabilidad valor={analisis.final.probabilidad} label="Final" />
            <BarraProbabilidad valor={analisis.claude.probabilidad} label="Claude" />
            <BarraProbabilidad valor={analisis.gpt.probabilidad} label="GPT-4o" />
            <BarraProbabilidad valor={analisis.gemini.probabilidad} label="Gemini" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#f9f9f8] rounded-lg p-3">
            <div className="text-xs text-[#6b7280] mb-0.5">Precio objetivo</div>
            <div className="font-mono font-semibold text-emerald-600">${analisis.final.precioObjetivo.toFixed(2)}</div>
          </div>
          <div className="bg-[#f9f9f8] rounded-lg p-3">
            <div className="text-xs text-[#6b7280] mb-0.5">Stop loss</div>
            <div className="font-mono font-semibold text-red-500">${analisis.final.stopLoss.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-[#f9f9f8] rounded-lg p-3 mb-3">
          <div className="text-xs text-[#6b7280] mb-1">Veredicto final</div>
          <p className="text-xs text-[#374151] leading-relaxed">{analisis.final.razon}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <div className="text-xs text-[#6b7280]">RSI</div>
            <div className={`font-mono text-sm font-medium ${indicadores.rsi < 30 ? 'text-emerald-600' : indicadores.rsi > 70 ? 'text-red-500' : 'text-[#111827]'}`}>
              {indicadores.rsi}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[#6b7280]">Tendencia</div>
            <div className={`text-sm font-medium ${indicadores.tendencia === 'ALZA' ? 'text-emerald-600' : 'text-red-500'}`}>
              {indicadores.tendencia}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[#6b7280]">Volumen</div>
            <div className={`font-mono text-sm font-medium ${indicadores.volumenRelativo > 1.5 ? 'text-emerald-600' : 'text-[#111827]'}`}>
              {indicadores.volumenRelativo}x
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpandido(!expandido)}
          className="text-xs text-[#6b7280] hover:text-[#111827] transition-colors"
        >
          {expandido ? 'Ocultar' : 'Ver'} análisis detallado por IA
        </button>
      </div>

      {expandido && (
        <div className="border-t border-[#e5e7eb] p-5 space-y-4">
          {[
            { label: 'Claude', data: analisis.claude },
            { label: 'GPT-4o', data: analisis.gpt },
            { label: 'Gemini', data: analisis.gemini }
          ].map(({ label, data }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[#374151]">{label}</span>
                <span className="font-mono text-xs text-[#111827]">{data.probabilidad}%</span>
              </div>
              <p className="text-xs text-[#6b7280] leading-relaxed">{data.razon}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Analizador({ token }: { token: string }) {
  const [tickers, setTickers] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [sentimiento, setSentimiento] = useState<any>(null);
  const [error, setError] = useState('');

  const analizar = async () => {
    const lista = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    if (lista.length === 0) return;
    if (lista.length > 5) { setError('Máximo 5 acciones'); return; }

    setCargando(true);
    setError('');
    setResultados([]);

    try {
      const r = await fetch('/api/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ tickers: lista })
      });
      const data = await r.json();
      if (data.error) { setError(data.error); return; }
      setResultados(data.resultados);
      setSentimiento(data.sentimientoMercado);
    } catch {
      setError('Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-base font-semibold text-[#111827] mb-1">Análisis Buy the Close</h2>
        <p className="text-sm text-[#6b7280]">Ingresa hasta 5 tickers separados por coma para analizar su probabilidad de rebote overnight.</p>
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

      {sentimiento && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 mb-6 flex items-center gap-6">
          <div>
            <div className="text-xs text-[#6b7280]">Sentimiento mercado</div>
            <div className={`text-sm font-medium ${
              sentimiento.sentimiento === 'ALCISTA' ? 'text-emerald-600' :
              sentimiento.sentimiento === 'BAJISTA' ? 'text-red-500' : 'text-[#6b7280]'
            }`}>{sentimiento.sentimiento}</div>
          </div>
          <div>
            <div className="text-xs text-[#6b7280]">SPY</div>
            <div className={`font-mono text-sm font-medium ${sentimiento.spy >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {sentimiento.spy >= 0 ? '+' : ''}{sentimiento.spy}%
            </div>
          </div>
          <div>
            <div className="text-xs text-[#6b7280]">VIX</div>
            <div className={`font-mono text-sm font-medium ${sentimiento.vix > 25 ? 'text-red-500' : 'text-[#111827]'}`}>
              {sentimiento.vix}
            </div>
          </div>
        </div>
      )}

      {cargando && (
        <div className="text-center py-12">
          <div className="text-sm text-[#6b7280]">Consultando Claude, GPT-4o y Gemini...</div>
          <div className="text-xs text-[#9ca3af] mt-1">Esto puede tomar 15-30 segundos</div>
        </div>
      )}

      <div className="space-y-4">
        {resultados.map(r => <TarjetaResultado key={r.ticker} r={r} />)}
      </div>
    </div>
  );
}
