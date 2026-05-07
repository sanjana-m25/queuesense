import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateConsentToken } from '@/lib/tokens';

/**
 * POST /api/consent/accept
 * Marks a patient's consent as accepted.
 * 
 * Query Params: ?token=...
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  // 1. Validate Token
  const validation = await validateConsentToken(token);

  if (!validation.valid) {
    if (validation.expired) {
      return NextResponse.json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, { status: 410 });
    }
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // 2. Update status (Idempotent)
    const { error } = await supabase
      .from('patient_consent_tokens')
      .update({ 
        accepted: true,
        accepted_at: new Date().toISOString()
      })
      .eq('token', token);

    if (error) throw error;

    // 3. Return success with hospital location
    return NextResponse.json({
      accepted: true,
      hospital_lat: parseFloat(process.env.HOSPITAL_LAT || '0'),
      hospital_lng: parseFloat(process.env.HOSPITAL_LNG || '0')
    });

  } catch (error: any) {
    console.error('Consent Accept Error:', error);
    return NextResponse.json({ error: 'Failed to accept consent' }, { status: 500 });
  }
}
