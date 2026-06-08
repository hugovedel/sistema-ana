import { NextRequest, NextResponse } from 'next/server';
import { obtenerDatosAccion, obtenerSentimientoMercado } from '@/lib/mercado';
import { analizarConClaude, analizarConGPT, analizarConGemini, calcularVeredictoFinal } from '@/lib/analizador';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { tickers } = await req.json();

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return NextResponse.json({ error: 'Debes proporcionar al menos un ticker' }, { status: 400 });
    }

    if (tickers.length > 5) {
      return NextResponse.json({ error: 'Máximo 5 tickers por análisis' }, { status: 400 });
    }

    const sentimiento = await obtenerSentimientoMercado();
    const resultados = [];

    for (const ticker of tickers) {
      const tickerUpper = ticker.toUpperCase().trim();
      console.log(`Analizando ${tickerUpper}...`);

      const datos = await obtenerDatosAccion(tickerUpper);
      if (!datos) {
        resultados.push({ ticker: tickerUpper, error: 'No se pudieron obtener datos' });
        continue;
      }

      const noticias = `Sector ${datos.sector}. Volumen ${datos.volumenRelativo}x el promedio. Cambio del día: ${datos.cambioDia}%.`;

      const [claude, gpt, geminiV] = await Promise.all([
        analizarConClaude(datos, sentimiento, noticias),
        analizarConGPT(datos, sentimiento, noticias),
        analizarConGemini(datos, sentimiento, noticias)
      ]);

      const analisis = calcularVeredictoFinal(claude, gpt, geminiV);
      if (!analisis) {
        resultados.push({ ticker: tickerUpper, error: 'Error en el análisis de IAs' });
        continue;
      }

      const registro = {
        fecha: new Date().toISOString().split('T')[0],
        ticker: tickerUpper,
        precio_cierre: datos.precioActual,
        probabilidad_rebote_claude: analisis.claude.probabilidad,
        probabilidad_rebote_gemini: analisis.gemini.probabilidad,
        probabilidad_rebote_gpt: analisis.gpt.probabilidad,
        probabilidad_rebote_final: analisis.final.probabilidad,
        precio_objetivo: analisis.final.precioObjetivo,
        stop_loss: analisis.final.stopLoss,
        razon_claude: analisis.claude.razon,
        razon_gemini: analisis.gemini.razon,
        razon_gpt: analisis.gpt.razon,
        razon_final: analisis.final.razon,
        rsi: datos.rsi,
        macd: datos.macd,
        sma20: datos.sma20,
        sma50: datos.sma50,
        tendencia: datos.tendencia,
        sentimiento_mercado: sentimiento.sentimiento,
        resultado: 'pendiente'
      };

      await supabase.from('analisis').insert(registro);

      resultados.push({
        ticker: tickerUpper,
        nombre: datos.nombre,
        precioActual: datos.precioActual,
        cambioDia: datos.cambioDia,
        sentimiento,
        indicadores: {
          rsi: datos.rsi,
          macd: datos.macd,
          sma20: datos.sma20,
          sma50: datos.sma50,
          tendencia: datos.tendencia,
          volumenRelativo: datos.volumenRelativo
        },
        analisis
      });
    }

    return NextResponse.json({ resultados, sentimientoMercado: sentimiento });
  } catch (e) {
    console.error('Error en análisis:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
