import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY required');
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

export function initSupabase(url?: string, key?: string): SupabaseClient {
  _supabase = createClient(
    url ?? process.env.SUPABASE_URL!,
    key ?? process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  return _supabase;
}
