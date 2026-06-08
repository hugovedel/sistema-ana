import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { obtenerDatosAccion } from '@/lib/mercado';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST() {
  try {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const fechaAyer = ayer.toISOString().split('T')[0];

    const { data: pendientes, error } = await supabase
      .from('analisis')
      .select('*')
      .eq('resultado', 'pendiente')
      .eq('fecha', fechaAyer);

    if (error) throw error;
    if (!pendientes || pendientes.length === 0) {
      return NextResponse.json({ mensaje: 'No hay predicciones pendientes de ayer' });
    }

    const calificados = [];

    for (const pred of pendientes) {
      const datos = await obtenerDatosAccion(pred.ticker);
      if (!datos) continue;

      const precioApertura = datos.precioActual;
      const precioCierre = pred.precio_cierre;
      const cambioPorcentaje = ((precioApertura - precioCierre) / precioCierre) * 100;

      const resultado = cambioPorcentaje > 0 ? 'correcto' : 'incorrecto';

      await supabase
        .from('analisis')
        .update({
          resultado,
          precio_apertura_siguiente: precioApertura,
          porcentaje_cambio: parseFloat(cambioPorcentaje.toFixed(2))
        })
        .eq('id', pred.id);

      calificados.push({
        ticker: pred.ticker,
        resultado,
        cambioPorcentaje: parseFloat(cambioPorcentaje.toFixed(2))
      });
    }

    return NextResponse.json({
      mensaje: `${calificados.length} predicciones calificadas`,
      calificados
    });
  } catch (e) {
    console.error('Error calificando:', e);
    return NextResponse.json({ error: 'Error calificando predicciones' }, { status: 500 });
  }
}
