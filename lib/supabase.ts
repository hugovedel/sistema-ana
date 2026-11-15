import { createClient } from '@supabase/supabase-js';

// Sin tipos generados de la base de datos, el cliente rechaza insert/update.
// Se tipa como `any` para evitar errores de compilación en el build.
let cliente: any = null;

export function getSupabase(): any {
  if (!cliente) {
    cliente = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return cliente;
}
