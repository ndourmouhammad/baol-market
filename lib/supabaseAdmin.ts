import { createClient } from '@supabase/supabase-js'

// ⚠️ Ce client utilise la clé service_role : il contourne les règles RLS.
// Il ne doit JAMAIS être importé dans un composant 'use client'.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)