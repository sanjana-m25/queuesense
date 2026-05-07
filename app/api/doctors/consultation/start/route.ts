import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';

/**
 * POST /api/doctors/consultation/start
 * Marks the beginning of a patient consultation.
 * 
 * Auth: Admin or Doctor role.
 * Body: { appointment_id }
 */
export async function POST(request: NextRequest) {
  // 1. Auth Check
  const auth = await requireRole(request, ['admin', 'doctor']);
  if (auth instanceof NextResponse) return auth;

  const { appointment_id: appointmentId } = await request.json();

  if (!appointmentId) {
    return NextResponse.json({ error: 'Missing appointment_id' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    // 2. Fetch appointment to check status
    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select('status, doctor_id')
      .eq('id', appointmentId)
      .single();

    if (apptError || !appt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (appt.status === 'in_consultation') {
      return NextResponse.json({ error: 'Consultation already in progress' }, { status: 409 });
    }

    if (appt.status === 'completed') {
      return NextResponse.json({ error: 'Consultation already completed' }, { status: 400 });
    }

    const startedAt = new Date().toISOString();

    // 3. Start Consultation
    // Create row in consultations table
    const { error: consultError } = await supabase
      .from('consultations')
      .insert({
        appointment_id: appointmentId,
        doctor_id: appt.doctor_id,
        started_at: startedAt
      });

    if (consultError) throw consultError;

    // 4. Update Appointment Status
    await supabase
      .from('appointments')
      .update({ status: 'in_consultation' })
      .eq('id', appointmentId);

    return NextResponse.json({ started_at: startedAt });

  } catch (error: any) {
    console.error('Consultation Start Error:', error);
    return NextResponse.json({ error: 'Failed to start consultation' }, { status: 500 });
  }
}
