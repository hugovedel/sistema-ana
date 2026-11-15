import { NextRequest } from 'next/server';
import { getSupabase } from './supabase';

// Verifica el token de sesión (Authorization: Bearer ...) contra la tabla `sesiones`.
// Usa la misma consulta que GET /api/auth.
export async function verificarSesion(req: NextRequest): Promise<boolean> {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.error('verificarSesion: sin token en la petición');
      return false;
    }

    const { data, error } = await getSupabase()
      .from('sesiones')
      .select('*')
      .eq('token', token)
      .gt('expira_en', new Date().toISOString())
      .single();

    if (error) console.error('verificarSesion: error de Supabase:', error.message);
    return !!data;
  } catch (e) {
    console.error('verificarSesion: excepción:', e);
    return false;
  }
}
