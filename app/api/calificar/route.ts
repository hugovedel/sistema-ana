import { NextRequest, NextResponse } from 'next/server';
import { verificarSesion } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import { buscarTema, umbralAcierto } from '@/lib/etfs';
import { fechaChicago } from '@/lib/reloj';

export const maxDuration = 60;

interface Barra { fecha: string; open: number; close: number }

async function barrasDiarias(ticker: string): Promise<Barra[]> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1mo`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Accept: 'application/json' } }
  );
  const data = await res.json();
  const r = data?.chart?.result?.[0];
  const ts: number[] = r?.timestamp || [];
  const q = r?.indicators?.quote?.[0];
  const barras: Barra[] = [];
  ts.forEach((t, i) => {
    const open = q?.open?.[i];
    const close = q?.close?.[i];
    if (open == null || close == null) return;
    barras.push({ fecha: fechaChicago(new Date(t * 1000)), open, close });
  });
  return barras;
}

export async function POST(req: NextRequest) {
  if (!(await verificarSesion(req))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    const hoy = fechaChicago();

    const { data: pendientes, error } = await supabase
      .from('decisiones_ia')
      .select('*')
      .eq('resultado', 'pendiente')
      .lt('fecha', hoy);

    if (error) throw error;
    if (!pendientes || pendientes.length === 0) {
      return NextResponse.json({ mensaje: 'No hay decisiones pendientes por calificar' });
    }

    const cache: Record<string, Barra[]> = {};
    const obtener = async (t: string) => (cache[t] ||= await barrasDiarias(t));

    let calificadas = 0;
    let omitidas = 0;

    for (const p of pendientes as any[]) {
      const tema = buscarTema(p.tema);
      const alc = tema ? tema.alcista : p.tema;
      const inv = tema ? tema.inverso : null;
      const umbral = umbralAcierto(tema ? tema.apalancamiento : 1);

      // Rendimiento overnight: cierre de la fecha -> apertura de la siguiente barra
      const rend = async (t: string): Promise<number | null> => {
        const barras = await obtener(t);
        const i = barras.findIndex(b => b.fecha === p.fecha);
        if (i === -1 || i + 1 >= barras.length) return null;
        return ((barras[i + 1].open - barras[i].close) / barras[i].close) * 100;
      };

      let resultado: string;
      let rendimiento: number | null = null;

      if (p.decision === 'no_operar') {
        const rA = await rend(alc);
        const rI = inv ? await rend(inv) : null;
        if (rA === null || (inv && rI === null)) { omitidas++; continue; }
        const mejor = Math.max(rA, rI ?? -Infinity);
        resultado = mejor > umbral ? 'oportunidad_perdida' : 'correcto';
      } else {
        const elegido = p.decision === 'inverso' && inv ? inv : alc;
        rendimiento = await rend(elegido);
        if (rendimiento === null) { omitidas++; continue; }
        resultado = rendimiento > umbral ? 'correcto' : 'incorrecto';
      }

      await supabase
        .from('decisiones_ia')
        .update({ resultado, rendimiento_pct: rendimiento === null ? null : parseFloat(rendimiento.toFixed(2)) })
        .eq('id', p.id);
      calificadas++;
    }

    return NextResponse.json({
      mensaje: `${calificadas} decisiones calificadas${omitidas ? `, ${omitidas} aún sin apertura disponible` : ''}`
    });
  } catch (e) {
    console.error('Error calificando:', e);
    return NextResponse.json({ error: 'Error calificando decisiones' }, { status: 500 });
  }
}
