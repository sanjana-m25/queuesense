import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from './supabase/server';
import { User } from '@supabase/supabase-js';

export type AuthResult = {
  user: User;
  role: string;
};

/**
 * Extracts the role from the user's metadata.
 * 
 * @param user The Supabase user object.
 * @returns The role string found in metadata, or an empty string.
 */
export function getRole(user: User): string {
  return user.user_metadata?.role || '';
}

/**
 * Middleware-like utility for API routes to enforce role-based access control.
 * 
 * @param request The incoming Next.js request.
 * @param roles Array of allowed roles.
 * @returns An AuthResult if successful, or a NextResponse (401/403) if unauthorized.
 */
export async function requireRole(
  request: NextRequest, 
  roles: string[]
): Promise<AuthResult | NextResponse> {
  const supabase = await createServerClient();
  
  // getUser() is more secure than getSession() as it validates the JWT with Supabase Auth
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized: No active session' }, 
      { status: 401 }
    );
  }

  const role = getRole(user);

  if (!roles.includes(role)) {
    return NextResponse.json(
      { error: `Forbidden: Required role(s) [${roles.join(', ')}] not met by [${role}]` }, 
      { status: 403 }
    );
  }

  return { user, role };
}
