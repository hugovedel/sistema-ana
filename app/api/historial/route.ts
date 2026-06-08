import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('analisis')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(100);

    if (error) throw error;

    const total = data.length;
    const calificados = data.filter(d => d.resultado !== 'pendiente');
    const correctos = calificados.filter(d => d.resultado === 'correcto').length;
    const precision = calificados.length > 0
      ? parseFloat(((correctos / calificados.length) * 100).toFixed(1))
      : 0;

    return NextResponse.json({
      analisis: data,
      estadisticas: {
        total,
        calificados: calificados.length,
        correctos,
        incorrectos: calificados.length - correctos,
        precision
      }
    });
  } catch (e) {
    console.error('Error historial:', e);
    return NextResponse.json({ error: 'Error obteniendo historial' }, { status: 500 });
  }
}
