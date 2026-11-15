import { createClient } from '@supabase/supabase-js';

let cliente: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!cliente) {
    cliente = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return cliente;
}
