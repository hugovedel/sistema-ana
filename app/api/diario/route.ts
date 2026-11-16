import { NextRequest, NextResponse } from 'next/server';
import { verificarSesion } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const IAS = ['claude', 'gpt', 'gemini', 'grok'];
const DECISIONES = ['segui_veredicto', 'segui_ia', 'mia'];

async function noAutorizado(req: NextRequest) {
  return !(await verificarSesion(req));
}

export async function GET(req: NextRequest) {
  if (await noAutorizado(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { data, error } = await getSupabase()
    .from('diario')
    .select('*')
    .order('fecha_compra', { ascending: false })
    .order('creado_en', { ascending: false })
    .limit(500);
  if (error) {
    console.error('diario GET:', error.message);
    return NextResponse.json({ error: 'No se pudo leer el diario (¿existe la tabla diario?)' }, { status: 500 });
  }
  return NextResponse.json({ filas: data || [] });
}

export async function POST(req: NextRequest) {
  if (await noAutorizado(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const b = await req.json();
  const etf = String(b.etf || '').trim().toUpperCase();
  const monto = Number(b.monto_compra);
  if (!/^[A-Z.\-]{1,10}$/.test(etf)) return NextResponse.json({ error: 'ETF inválido' }, { status: 400 });
  if (!isFinite(monto) || monto <= 0) return NextResponse.json({ error: 'Monto de compra inválido' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.fecha_compra))) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  const decision = DECISIONES.includes(b.decision) ? b.decision : 'mia';
  const ia = decision === 'segui_ia' && IAS.includes(b.ia_seguida) ? b.ia_seguida : null;

  const sb = getSupabase();
  // No promediar a la baja: si ya hay una compra abierta del mismo ETF, pide confirmación.
  if (!b.forzar) {
    const { data: abiertas } = await sb.from('diario').select('id').eq('etf', etf).eq('estado', 'abierta').limit(1);
    if (abiertas && abiertas.length > 0) {
      return NextResponse.json(
        { error: `Ya tienes una compra abierta de ${etf}. Comprar más para promediar es una mala práctica.`, yaAbierta: true },
        { status: 409 }
      );
    }
  }
  const num = (v: any) => (v !== undefined && v !== null && v !== '' && isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
  const fila: Record<string, any> = {
    fecha_compra: b.fecha_compra,
    etf,
    monto_compra: monto,
    decision,
    ia_seguida: ia,
    comisiones: Number(b.comisiones) > 0 ? Number(b.comisiones) : 0,
    notas: String(b.notas || '').slice(0, 500) || null,
    estado: 'abierta',
    mantuve: false,
    precio_ref: num(b.precio_ref),
    precio_compra: num(b.precio_compra)
  };
  let { error } = await sb.from('diario').insert(fila);
  if (error && /precio_/i.test(String(error.message))) {
    // Faltan las columnas de precios en Supabase: se guarda sin ellas.
    const { precio_ref, precio_compra, ...resto } = fila;
    ({ error } = await sb.from('diario').insert(resto));
  }
  if (error) {
    console.error('diario POST:', error.message);
    return NextResponse.json({ error: 'No se pudo guardar la operación' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (await noAutorizado(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  const cambios: Record<string, any> = {};
  if (typeof b.mantuve === 'boolean') cambios.mantuve = b.mantuve;
  if (b.monto_venta !== undefined && b.monto_venta !== null && b.monto_venta !== '') {
    const mv = Number(b.monto_venta);
    if (!isFinite(mv) || mv < 0) return NextResponse.json({ error: 'Monto de venta inválido' }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.fecha_venta))) return NextResponse.json({ error: 'Fecha de venta inválida' }, { status: 400 });
    cambios.monto_venta = mv;
    cambios.fecha_venta = b.fecha_venta;
    cambios.estado = 'cerrada';
    if (Number(b.precio_venta) > 0) cambios.precio_venta = Number(b.precio_venta);
  }
  if (b.comisiones !== undefined && Number(b.comisiones) >= 0) cambios.comisiones = Number(b.comisiones);
  if (b.notas !== undefined) cambios.notas = String(b.notas || '').slice(0, 500) || null;
  if (Object.keys(cambios).length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });

  let { error } = await getSupabase().from('diario').update(cambios).eq('id', b.id);
  if (error && /precio_/i.test(String(error.message))) {
    const { precio_venta, ...resto } = cambios;
    ({ error } = await getSupabase().from('diario').update(resto).eq('id', b.id));
  }
  if (error) {
    console.error('diario PATCH:', error.message);
    return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (await noAutorizado(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });
  const { error } = await getSupabase().from('diario').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'No se pudo borrar' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
