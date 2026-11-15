import { NextRequest } from 'next/server';
import { getSupabase } from './supabase';

// Verifica el token de sesión (Authorization: Bearer ...) contra la tabla `sesiones`.
export async function verificarSesion(req: NextRequest): Promise<boolean> {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return false;

    const { data } = await getSupabase()
      .from('sesiones')
      .select('token')
      .eq('token', token)
      .gt('expira_en', new Date().toISOString())
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}
