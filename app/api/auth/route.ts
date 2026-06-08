import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (password !== process.env.AUTH_PASSWORD) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    const token = crypto.randomUUID();
    const expira = new Date();
    expira.setHours(expira.getHours() + 24);

    await supabase.from('sesiones').insert({
      token,
      expira_en: expira.toISOString()
    });

    return NextResponse.json({ token });
  } catch (e) {
    console.error('Error auth:', e);
    return NextResponse.json({ error: 'Error de autenticación' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ valid: false }, { status: 401 });

    const { data } = await supabase
      .from('sesiones')
      .select('*')
      .eq('token', token)
      .gt('expira_en', new Date().toISOString())
      .single();

    return NextResponse.json({ valid: !!data });
  } catch (e) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
}
