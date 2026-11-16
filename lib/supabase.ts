import { createClient } from '@supabase/supabase-js';

// Sin tipos generados de la base de datos, el cliente rechaza insert/update.
// Se tipa como `any` para evitar errores de compilación en el build.
let cliente: any = null;

function urlConfigurada() {
  const origen = process.env.SUPABASE_URL ? 'SUPABASE_URL' : 'NEXT_PUBLIC_SUPABASE_URL';
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  return { origen, url };
}

// Descripción segura para logs (solo host y ruta, sin claves)
export function describirUrlSupabase(): string {
  const { origen, url } = urlConfigurada();
  try {
    const u = new URL(url);
    return `${origen} -> host=${u.host} ruta="${u.pathname}" largo=${url.length}`;
  } catch {
    return `${origen} -> URL inválida (largo=${url.length})`;
  }
}

export function getSupabase(): any {
  if (!cliente) {
    // SUPABASE_URL tiene prioridad; se limpian espacios y diagonales finales
    const { url } = urlConfigurada();
    cliente = createClient(
      url,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return cliente;
}
