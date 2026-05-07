/**
 * lib/supabase/client.ts
 * ─────────────────────
 * Browser-side Supabase client using @supabase/ssr.
 * Safe to import in Client Components ('use client') and in browser-only code.
 *
 * Usage:
 *   import { createBrowserClient } from '@/lib/supabase/client'
 *   const supabase = createBrowserClient()
 */
import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createBrowserClient() {
  return createSSRBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
