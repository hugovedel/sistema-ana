import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Tema } from './etfs';

export type Decision = 'alcista' | 'inverso' | 'no_operar';
export type IAId = 'claude' | 'gpt' | 'gemini' | 'grok';

export interface IAConfig {
  id: IAId;
  nombre: string;
  modo: 'activa' | 'sombra';
  precioIn: number;  // USD por millón de tokens (ESTIMADO, verificar en el panel del proveedor)
  precioOut: number;
}

export const IAS_CONFIG: IAConfig[] = [
  { id: 'claude', nombre: 'Claude', modo: 'activa', precioIn: 3, precioOut: 15 },
  { id: 'gpt', nombre: 'GPT-4o', modo: 'activa', precioIn: 2.5, precioOut: 10 },
  { id: 'gemini', nombre: 'Gemini', modo: 'activa', precioIn: 0.3, precioOut: 2.5 },
  { id: 'grok', nombre: 'Grok', modo: 'sombra', precioIn: 3, precioOut: 15 }
];

export interface RespuestaIA {
  ia: IAId;
  nombre: string;
  modo: 'activa' | 'sombra';
  decision: Decision;
  confianza: number;
  razon: string;
  tokens_in: number;
  tokens_out: number;
  costo_usd: number;
  error?: string;
}

export interface DatosTicker {
  ticker: string;
  nombre: string;
  precioActual: number;
  cambioDia: number;
  rsi: number;
  macd: number;
  sma20: number;
  sma50: number;
  tendencia: string;
  volumenRelativo: number;
  max52s?: number;
  min52s?: number;
}

export function extraerJSON(texto: string): any {
  const i = texto.indexOf('{');
  const f = texto.lastIndexOf('}');
  if (i === -1 || f === -1 || f <= i) throw new Error('Sin JSON en la respuesta');
  return JSON.parse(texto.slice(i, f + 1));
}

function validar(obj: any, permitidas: Decision[]) {
  const decision = String(obj?.decision || '').toLowerCase().trim() as Decision;
  if (!permitidas.includes(decision)) throw new Error(`Decisión inválida: ${obj?.decision}`);
  let confianza = Number(obj?.confianza);
  if (!isFinite(confianza)) confianza = 50;
  confianza = Math.max(0, Math.min(100, confianza));
  return { decision, confianza, razon: String(obj?.razon || '').slice(0, 600) };
}

function bloqueDatos(d: DatosTicker): string {
  return `${d.ticker} (${d.nombre})
- Precio: $${d.precioActual} | Cambio del día: ${d.cambioDia}%
- RSI(14): ${d.rsi} | MACD: ${d.macd}
- SMA20: ${d.sma20} | SMA50: ${d.sma50} | Tendencia 5d: ${d.tendencia}
- Volumen relativo: ${d.volumenRelativo}x | Rango 52s: ${d.min52s ?? 'N/D'} - ${d.max52s ?? 'N/D'}`;
}

export function construirPrompt(
  tema: Tema | null,
  datos: DatosTicker[],
  sentimiento: { spy: number; vix: number; sentimiento: string }
): { prompt: string; permitidas: Decision[] } {
  const mercado = `MERCADO: SPY ${sentimiento.spy}% hoy | VIX ${sentimiento.vix} | Sentimiento ${sentimiento.sentimiento}`;
  const formato = `Responde ÚNICAMENTE con este JSON, sin texto adicional:
{"decision": "...", "confianza": numero 0-100, "razon": "2-3 oraciones concisas"}`;

  if (tema) {
    const permitidas: Decision[] = ['alcista', 'inverso', 'no_operar'];
    const prompt = `Eres analista de la estrategia "Buy the Close, Sell the Open": se compra cerca del cierre (3:00pm Chicago) y se vende en la apertura siguiente (8:30am Chicago). Solo importa el movimiento overnight (cierre de hoy -> apertura de mañana).

TEMA: ${tema.nombre}
Par de ETFs ${tema.apalancamiento}x:
- ALCISTA: ${tema.alcista}
- INVERSO: ${tema.inverso}

${datos.map(bloqueDatos).join('\n\n')}

${mercado}

Decide UNA opción:
- "alcista": comprar ${tema.alcista} (se espera gap al alza)
- "inverso": comprar ${tema.inverso} (se espera gap a la baja)
- "no_operar": señal débil o riesgo alto

Considera: los ETFs apalancados amplifican gaps overnight y un stop loss no protege contra un gap. Si no hay ventaja clara, elige "no_operar". Un acierto requiere que el ETF elegido abra más de ${(tema.apalancamiento / 3).toFixed(2)}% arriba del cierre previo.

${formato}`;
    return { prompt, permitidas };
  }

  const d = datos[0];
  const permitidas: Decision[] = ['alcista', 'no_operar'];
  const prompt = `Eres analista de la estrategia "Buy the Close, Sell the Open": se compra cerca del cierre (3:00pm Chicago) y se vende en la apertura siguiente (8:30am Chicago).

ACCIÓN:
${bloqueDatos(d)}

${mercado}

Decide UNA opción:
- "alcista": comprar ${d.ticker} (se espera que abra más de 0.33% arriba del cierre)
- "no_operar": señal débil o riesgo alto

Si no hay ventaja clara, elige "no_operar".

${formato}`;
  return { prompt, permitidas };
}

async function llamar(ia: IAId, prompt: string): Promise<{ texto: string; tin: number; tout: number }> {
  if (ia === 'claude') {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const m = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    });
    const bloque = m.content.find(b => b.type === 'text') as any;
    return { texto: bloque?.text || '', tin: m.usage.input_tokens, tout: m.usage.output_tokens };
  }

  if (ia === 'gpt' || ia === 'grok') {
    const cliente = ia === 'grok'
      ? new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' })
      : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const modelo = ia === 'grok' ? (process.env.XAI_MODEL || 'grok-4') : 'gpt-4o';
    const r = await cliente.chat.completions.create({
      model: modelo,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });
    return {
      texto: r.choices[0]?.message?.content || '',
      tin: r.usage?.prompt_tokens || 0,
      tout: r.usage?.completion_tokens || 0
    };
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const modelo = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const r = await modelo.generateContent(prompt);
  const uso: any = r.response.usageMetadata;
  return {
    texto: r.response.text(),
    tin: uso?.promptTokenCount || 0,
    tout: (uso?.candidatesTokenCount || 0) + (uso?.thoughtsTokenCount || 0)
  };
}

async function consultar(cfg: IAConfig, prompt: string, permitidas: Decision[]): Promise<RespuestaIA> {
  const base = { ia: cfg.id, nombre: cfg.nombre, modo: cfg.modo };
  try {
    const { texto, tin, tout } = await llamar(cfg.id, prompt);
    const v = validar(extraerJSON(texto), permitidas);
    const costo = (tin * cfg.precioIn + tout * cfg.precioOut) / 1_000_000;
    return { ...base, ...v, tokens_in: tin, tokens_out: tout, costo_usd: parseFloat(costo.toFixed(5)) };
  } catch (e: any) {
    console.error(`Error ${cfg.nombre}:`, e?.message || e);
    return {
      ...base,
      decision: 'no_operar',
      confianza: 0,
      razon: '',
      tokens_in: 0,
      tokens_out: 0,
      costo_usd: 0,
      error: String(e?.message || 'Error').slice(0, 200)
    };
  }
}

export function consultarTodas(prompt: string, permitidas: Decision[]): Promise<RespuestaIA[]> {
  return Promise.all(IAS_CONFIG.map(cfg => consultar(cfg, prompt, permitidas)));
}

// Mayoría (>=2) entre las IAs ACTIVAS que respondieron; si no hay mayoría -> no_operar.
export function veredictoConsenso(respuestas: RespuestaIA[]): { decision: Decision; votos: Record<string, number> } {
  const votos: Record<string, number> = {};
  for (const r of respuestas) {
    if (r.modo !== 'activa' || r.error) continue;
    votos[r.decision] = (votos[r.decision] || 0) + 1;
  }
  let decision: Decision = 'no_operar';
  for (const [d, n] of Object.entries(votos)) {
    if (n >= 2) decision = d as Decision;
  }
  return { decision, votos };
}
