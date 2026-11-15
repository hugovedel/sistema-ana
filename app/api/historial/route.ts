import { NextRequest, NextResponse } from 'next/server';
import { verificarSesion } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import { IAS_CONFIG } from '@/lib/analizador';

export async function GET(req: NextRequest) {
  if (!(await verificarSesion(req))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { data, error } = await getSupabase()
      .from('decisiones_ia')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(300);

    if (error) throw error;
    const filas = (data || []) as any[];

    const tablero = IAS_CONFIG.map(cfg => {
      const suyas = filas.filter(f => f.ia === cfg.id);
      const calificadas = suyas.filter(f => f.resultado !== 'pendiente');
      const correctas = calificadas.filter(f => f.resultado === 'correcto').length;
      const ops = calificadas.filter(f => f.decision !== 'no_operar' && f.rendimiento_pct != null);
      const rendProm = ops.length
        ? ops.reduce((a, f) => a + Number(f.rendimiento_pct), 0) / ops.length
        : null;
      return {
        ia: cfg.id,
        nombre: cfg.nombre,
        modo: cfg.modo,
        decisiones: suyas.length,
        calificadas: calificadas.length,
        correctas,
        precision: calificadas.length ? parseFloat(((correctas / calificadas.length) * 100).toFixed(1)) : null,
        operaciones: ops.length,
        rendimientoPromedio: rendProm === null ? null : parseFloat(rendProm.toFixed(2)),
        costoTotal: parseFloat(suyas.reduce((a, f) => a + Number(f.costo_usd || 0), 0).toFixed(4))
      };
    });

    return NextResponse.json({ filas, tablero });
  } catch (e) {
    console.error('Error historial:', e);
    return NextResponse.json({ error: 'Error obteniendo historial' }, { status: 500 });
  }
}
