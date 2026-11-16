import { NextRequest, NextResponse } from 'next/server';
import { verificarSesion } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import { buscarTema } from '@/lib/etfs';
import { obtenerDatosAccion, obtenerSentimientoMercado } from '@/lib/mercado';
import { construirPrompt, consultarTodas, veredictoConsenso } from '@/lib/analizador';
import { fechaChicago } from '@/lib/reloj';
import { eventosEnVentana } from '@/lib/calendario';

export const maxDuration = 60;

// Diagnostica UN tema (ETF) o UN ticker (acción). El cliente llama una vez por tema.
export async function POST(req: NextRequest) {
  if (!(await verificarSesion(req))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { tema: temaId, ticker, forzar } = await req.json();
    const supabase = getSupabase();

    const tema = temaId ? buscarTema(String(temaId)) : undefined;
    let tickers: string[];
    let idTema: string;
    let titulo: string;
    let modo: 'etf' | 'accion';

    if (tema) {
      tickers = [tema.alcista, tema.inverso];
      idTema = tema.id;
      titulo = tema.nombre;
      modo = 'etf';
    } else if (typeof ticker === 'string' && /^[A-Za-z.\-]{1,10}$/.test(ticker.trim())) {
      const t = ticker.trim().toUpperCase();
      tickers = [t];
      idTema = t;
      titulo = t;
      modo = 'accion';
    } else {
      return NextResponse.json({ error: 'Tema o ticker inválido' }, { status: 400 });
    }

    // Un solo diagnóstico por día y tema, para no sesgar la medición.
    const fecha = fechaChicago();
    const { data: previo } = await supabase
      .from('decisiones_ia')
      .select('id')
      .eq('fecha', fecha)
      .eq('tema', idTema)
      .limit(1);
    if (previo && previo.length > 0 && !forzar) {
      return NextResponse.json(
        { error: 'Ya hay un diagnóstico de hoy para este tema', yaExiste: true, titulo },
        { status: 409 }
      );
    }

    const [datos, sentimiento] = await Promise.all([
      Promise.all(tickers.map(t => obtenerDatosAccion(t))),
      obtenerSentimientoMercado()
    ]);
    if (datos.some(d => !d)) {
      return NextResponse.json({ error: `No se pudieron obtener datos de ${tickers.join('/')}` }, { status: 502 });
    }

    const { prompt, permitidas } = construirPrompt(tema || null, datos as any[], sentimiento);
    const respuestas = await consultarTodas(prompt, permitidas);
    const consenso = veredictoConsenso(respuestas);

    const etfDe = (d: string) =>
      d === 'no_operar' ? null : tema ? (d === 'alcista' ? tema.alcista : tema.inverso) : tickers[0];

    const precioDe = (d: string) => {
      if (d === 'no_operar') return null;
      const i = tema ? (d === 'alcista' ? 0 : 1) : 0;
      return (datos as any[])[i]?.precioActual ?? null;
    };

    // Veto por eventos macro: regla en código, no la deciden las IAs.
    const ventana = eventosEnVentana(new Date(), idTema, modo === 'accion');
    const veto = ventana.vetos.length > 0;

    const filas = respuestas
      .filter(r => !r.error)
      .map(r => ({
        fecha,
        tema: idTema,
        ia: r.ia,
        modo: r.modo,
        modelo: r.modelo,
        decision: r.decision,
        etf_elegido: etfDe(r.decision),
        precio_ref: precioDe(r.decision),
        confianza: r.confianza,
        razon: r.razon,
        tokens_in: r.tokens_in,
        tokens_out: r.tokens_out,
        costo_usd: r.costo_usd,
        resultado: 'pendiente'
      }));

    if (filas.length > 0) {
      // Un re-diagnóstico del mismo día reemplaza al anterior que siga pendiente
      await supabase.from('decisiones_ia').delete().eq('fecha', fecha).eq('tema', idTema).eq('resultado', 'pendiente');
      let { error } = await supabase.from('decisiones_ia').insert(filas);
      if (error && /modelo|precio_ref/i.test(String(error.message))) {
        // Faltan columnas opcionales en Supabase: se guarda sin ellas.
        console.error('Faltan columnas modelo/precio_ref en decisiones_ia; guardando sin ellas');
        ({ error } = await supabase
          .from('decisiones_ia')
          .insert(filas.map(({ modelo, precio_ref, ...resto }: any) => resto)));
      }
      if (error) console.error('Error guardando decisiones:', error);
    }

    return NextResponse.json({
      tema: idTema,
      titulo,
      modo,
      consenso: veto
        ? { ...consenso, decision: 'no_operar', etf: null, original: consenso.decision }
        : { ...consenso, etf: etfDe(consenso.decision) },
      veto: ventana.vetos.map(e => `${e.nombre} · ${e.fecha} ${e.hora} CT`),
      avisos: ventana.avisos.map(e => `${e.nombre} · ${e.fecha} ${e.hora} CT`),
      ias: respuestas,
      costoTotal: parseFloat(respuestas.reduce((a, r) => a + r.costo_usd, 0).toFixed(5)),
      sentimiento
    });
  } catch (e) {
    console.error('Error diagnosticando:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
