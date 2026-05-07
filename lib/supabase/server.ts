/**
 * lib/supabase/server.ts
 * Server-side Supabase client using @supabase/ssr.
 * Reads/writes cookies via next/headers (async in Next.js 15+).
 *
 * Works in:
 *   - Server Components
 *   - Server Functions (Server Actions)
 *   - Route Handlers (app/api/route.ts files)
 *
 * WARNING: Do NOT import this in Client Components.
 *
 * Usage:
 *   import { createServerClient } from '@/lib/supabase/server'
 *   const supabase = await createServerClient()
 */
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createServerClient() {
  // cookies() is async in Next.js 15+
  const cookieStore = await cookies();

  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from Server Components where cookies cannot be
            // mutated. Middleware handles session refresh so this is safe.
          }
        },
      },
    }
  );
}
