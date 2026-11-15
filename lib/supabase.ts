import { createClient } from '@supabase/supabase-js';

// Sin tipos generados de la base de datos, el cliente rechaza insert/update.
// Se tipa como `any` para evitar errores de compilación en el build.
let cliente: any = null;

export function getSupabase(): any {
  if (!cliente) {
    // SUPABASE_URL tiene prioridad; se limpian espacios y diagonales finales
    const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .trim()
      .replace(/\/+$/, '');
    cliente = createClient(
      url,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return cliente;
}
