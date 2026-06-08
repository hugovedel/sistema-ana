import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface VeredictoIA {
  probabilidad: number;
  precioObjetivo: number;
  stopLoss: number;
  razon: string;
}

export interface AnalisisCompleto {
  claude: VeredictoIA;
  gemini: VeredictoIA;
  gpt: VeredictoIA;
  final: VeredictoIA & { confianza: string };
}

function construirPrompt(datos: any, sentimiento: any, noticias: string): string {
  return `Eres un analista de trading experto en la estrategia "Buy the Close, Sell the Open".
Analiza esta acción y determina la probabilidad de que abra más alto mañana que el cierre de hoy.

DATOS TÉCNICOS:
- Ticker: ${datos.ticker}
- Nombre: ${datos.nombre}
- Precio actual: $${datos.precioActual}
- Cambio del día: ${datos.cambioDia}%
- RSI (14): ${datos.rsi}
- MACD: ${datos.macd}
- SMA 20: ${datos.sma20}
- SMA 50: ${datos.sma50}
- Tendencia 5 días: ${datos.tendencia}
- Volumen relativo: ${datos.volumenRelativo}x promedio
- Máximo 52 semanas: $${datos.max52s}
- Mínimo 52 semanas: $${datos.min52s}
- Sector: ${datos.sector}

SENTIMIENTO DE MERCADO:
- SPY cambio hoy: ${sentimiento.spy}%
- VIX: ${sentimiento.vix}
- Sentimiento general: ${sentimiento.sentimiento}

NOTICIAS RECIENTES:
${noticias}

INSTRUCCIONES:
1. Analiza todos los factores anteriores
2. Considera patrones de gap up/down overnight
3. Evalúa si el volumen confirma la tendencia
4. Considera el sentimiento general del mercado
5. Pondera las noticias recientes
6. El stop loss debe ser máximo 3% bajo el precio actual
7. El precio objetivo debe ser conservador, máximo 4% sobre precio actual

Responde ÚNICAMENTE con este JSON sin texto adicional:
{
  "probabilidad": numero entre 0 y 100,
  "precioObjetivo": numero,
  "stopLoss": numero,
  "razon": "explicacion concisa en 2-3 oraciones"
}`;
}

export async function analizarConClaude(datos: any, sentimiento: any, noticias: string): Promise<VeredictoIA | null> {
  try {
    const prompt = construirPrompt(datos, sentimiento, noticias);
    const mensaje = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });
    const texto = mensaje.content[0].type === 'text' ? mensaje.content[0].text : '';
    return JSON.parse(texto.trim());
  } catch (e) {
    console.error('Error Claude:', e);
    return null;
  }
}

export async function analizarConGPT(datos: any, sentimiento: any, noticias: string): Promise<VeredictoIA | null> {
  try {
    const prompt = construirPrompt(datos, sentimiento, noticias);
    const respuesta = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });
    const texto = respuesta.choices[0].message.content || '';
    return JSON.parse(texto.trim());
  } catch (e) {
    console.error('Error GPT:', e);
    return null;
  }
}

export async function analizarConGemini(datos: any, sentimiento: any, noticias: string): Promise<VeredictoIA | null> {
  try {
    const prompt = construirPrompt(datos, sentimiento, noticias);
    const modelo = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const resultado = await modelo.generateContent(prompt);
    const texto = resultado.response.text().trim();
    const json = texto.replace(/```json|```/g, '').trim();
    return JSON.parse(json);
  } catch (e) {
    console.error('Error Gemini:', e);
    return null;
  }
}

export function calcularVeredictoFinal(
  claude: VeredictoIA | null,
  gpt: VeredictoIA | null,
  geminiV: VeredictoIA | null
): AnalisisCompleto | null {
  const validos = [claude, gpt, geminiV].filter(Boolean) as VeredictoIA[];
  if (validos.length === 0) return null;

  // Pesos: Claude 35%, GPT 35%, Gemini 30%
  const pesos = [0.35, 0.35, 0.30];
  const ias = [claude, gpt, geminiV];

  let probFinal = 0;
  let precioObjetivoFinal = 0;
  let stopLossFinal = 0;
  let pesoTotal = 0;

  ias.forEach((ia, i) => {
    if (ia) {
      probFinal += ia.probabilidad * pesos[i];
      precioObjetivoFinal += ia.precioObjetivo * pesos[i];
      stopLossFinal += ia.stopLoss * pesos[i];
      pesoTotal += pesos[i];
    }
  });

  probFinal = parseFloat((probFinal / pesoTotal).toFixed(1));
  precioObjetivoFinal = parseFloat((precioObjetivoFinal / pesoTotal).toFixed(4));
  stopLossFinal = parseFloat((stopLossFinal / pesoTotal).toFixed(4));

  let confianza = 'BAJA';
  if (probFinal >= 70) confianza = 'ALTA';
  else if (probFinal >= 55) confianza = 'MEDIA';

  return {
    claude: claude || { probabilidad: 0, precioObjetivo: 0, stopLoss: 0, razon: 'No disponible' },
    gemini: geminiV || { probabilidad: 0, precioObjetivo: 0, stopLoss: 0, razon: 'No disponible' },
    gpt: gpt || { probabilidad: 0, precioObjetivo: 0, stopLoss: 0, razon: 'No disponible' },
    final: {
      probabilidad: probFinal,
      precioObjetivo: precioObjetivoFinal,
      stopLoss: stopLossFinal,
      razon: `Consenso de ${validos.length} IAs. ${confianza === 'ALTA' ? 'Señal fuerte de rebote.' : confianza === 'MEDIA' ? 'Señal moderada.' : 'Señal débil, proceder con cautela.'}`,
      confianza
    }
  };
}
