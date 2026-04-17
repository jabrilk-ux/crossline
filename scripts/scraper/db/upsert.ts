import { createClient } from '@supabase/supabase-js';
import type { LawCategory } from '../config/sources';

// Use service role key — never the anon key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    _client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}

export interface StateLawInsert {
  state_code: string;
  category: LawCategory;
  plain_english: string;
  carry_status: 'allowed' | 'restricted' | 'prohibited' | null;
  statute_reference: string | null;
  statute_url: string | null;
  flagged: boolean;
  last_scraped: string; // ISO timestamp
}

/**
 * upsertLaw()
 * Insert or update a state_laws row.
 * Conflict target: (state_code, category)
 * Never overwrites last_verified — that is set by human review only.
 */
export async function upsertLaw(law: StateLawInsert, dryRun: boolean): Promise<void> {
  if (dryRun) return; // dry run — skip DB write

  const db = getClient();

  // Cast to any — scraper has no generated Supabase schema types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('state_laws') as any).upsert(
    {
      state_code:        law.state_code,
      category:          law.category,
      plain_english:     law.plain_english,
      carry_status:      law.carry_status,
      statute_reference: law.statute_reference,
      statute_url:       law.statute_url,
      flagged:           law.flagged,
      last_scraped:      law.last_scraped,
      updated_at:        new Date().toISOString(),
      // last_verified intentionally omitted — human review only
    },
    { onConflict: 'state_code,category', ignoreDuplicates: false }
  );

  if (error) {
    throw new Error(`Supabase upsert failed [${law.state_code}/${law.category}]: ${error.message}`);
  }
}
