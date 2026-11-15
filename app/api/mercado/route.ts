import { NextRequest, NextResponse } from 'next/server';
import { verificarSesion } from '@/lib/auth';
import { TODOS_LOS_ETFS } from '@/lib/etfs';
import { obtenerDatosAccion, obtenerSentimientoMercado } from '@/lib/mercado';

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (!(await verificarSesion(req))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const [datos, sentimiento] = await Promise.all([
    Promise.all(TODOS_LOS_ETFS.map(t => obtenerDatosAccion(t))),
    obtenerSentimientoMercado()
  ]);

  const etfs: Record<string, any> = {};
  TODOS_LOS_ETFS.forEach((t, i) => {
    const d = datos[i];
    etfs[t] = d
      ? {
          precio: d.precioActual,
          cambioDia: d.cambioDia,
          rsi: d.rsi,
          tendencia: d.tendencia,
          volumenRelativo: d.volumenRelativo
        }
      : null;
  });

  return NextResponse.json({ etfs, sentimiento });
}
