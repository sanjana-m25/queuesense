import { createAdminClient } from './supabase/admin';

/**
 * Generates a 32-character random hex string for use as a consent token.
 * Uses crypto.randomUUID() and removes the dashes.
 * 
 * @returns A 32-character random hex string.
 */
export function generateConsentToken(): string {
  // crypto.randomUUID() returns a string like "550e8400-e29b-41d4-a716-446655440000" (36 chars)
  // Removing dashes leaves 32 hex characters.
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Validates a consent token against the database.
 * 
 * @param token The token string to validate.
 * @returns An object indicating if the token is valid, and if not, whether it expired.
 */
export async function validateConsentToken(token: string): Promise<{ valid: boolean; appointmentId?: string; expired?: boolean }> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('patient_consent_tokens')
      .select('appointment_id, expires_at')
      .eq('token', token)
      .single();

    if (error || !data) {
      // Token doesn't exist
      return { valid: false };
    }

    const expiresAt = new Date(data.expires_at);
    const now = new Date();

    if (expiresAt < now) {
      // Token is expired
      return { valid: false, expired: true };
    }

    return {
      valid: true,
      appointmentId: data.appointment_id
    };
  } catch (err) {
    console.error('Error validating consent token:', err);
    return { valid: false };
  }
}
