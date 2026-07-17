import { createClient } from '@supabase/supabase-js';

// Server-side only client (service role key). Never import this into a
// 'use client' component — it has full table access, bypassing RLS.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
