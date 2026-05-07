import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateConsentToken } from '@/lib/tokens';

/**
 * GET /api/patient/status
 * Public endpoint for patients to check their queue status using a token.
 * 
 * Query Params: ?token=...
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const validation = await validateConsentToken(token);
  if (!validation.valid || !validation.appointmentId) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // 1. Fetch appointment and doctor details
    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select(`
        scheduled_time,
        doctor_id,
        doctors (name),
        patients (eta_status)
      `)
      .eq('id', validation.appointmentId)
      .single();

    if (apptError || !appt) throw new Error('Appointment not found');

    // 2. Fetch current queue position
    const { data: qEntry } = await supabase
      .from('queue_entries')
      .select('position')
      .eq('appointment_id', validation.appointmentId)
      .single();

    return NextResponse.json({
      position: qEntry?.position || null,
      scheduled_time: appt.scheduled_time,
      doctor_name: (appt.doctors as any).name,
      eta_status: (appt.patients as any).eta_status
    });

  } catch (error: any) {
    console.error('Patient Status Error:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
