/**
 * lib/supabase/admin.ts
 * ─────────────────────
 * Service-role Supabase client that BYPASSES Row Level Security.
 *
 * ⚠️  WARNING: This client has full database access.
 *     NEVER import this file in Client Components or expose it to the browser.
 *     Only use in:
 *       - Vercel Cron route handlers (/api/queue/recalculate, /api/consent/send)
 *       - Internal admin-only server-side operations
 *
 * This file intentionally has no cookie handling — it authenticates via the
 * service role key, not user JWTs.
 *
 * Usage:
 *   import { createAdminClient } from '@/lib/supabase/admin'
 *   const supabase = createAdminClient()
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      // Service role client should not persist sessions or auto-refresh tokens
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
