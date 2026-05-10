import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateConsentToken } from '@/lib/tokens';

/**
 * GET /api/patient/status
 * Public endpoint for patients to monitor live queue status.
 */
export async function GET(request: NextRequest) {

  const { searchParams } = new URL(request.url);

  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Missing token' },
      { status: 400 }
    );
  }

  const validation = await validateConsentToken(token);

  if (!validation.valid || !validation.appointmentId) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();

  try {

    // 1. Fetch appointment
    const { data: appt, error: apptError } =
      await supabase
        .from('appointments')
        .select(`
  id,
  patient_id,
  doctor_id,
  original_position,
  scheduled_time,
  scheduled_date,
  status,
  doctors(name),
  patients(name, eta_status)
`)
        .eq('id', validation.appointmentId)
        .single();

    if (apptError || !appt) {
      throw new Error('Appointment not found');
    }

    // 2. Try dynamic queue entry
    const { data: queueEntry } =
      await supabase
        .from('queue_entries')
        .select('position')
        .eq('appointment_id', validation.appointmentId)
        .maybeSingle();

    // 3. Use fallback if realtime queue missing
    const currentPosition =
      queueEntry?.position ??
      appt.original_position ??
      1;

    // 4. Calculate patients ahead
    const patientsAhead =
      currentPosition > 1
        ? currentPosition - 1
        : 0;

    // 5. Estimate wait time
    const estimatedWaitMinutes =
      patientsAhead * 15;

    return NextResponse.json({
      success: true,
      patient_id: appt.patient_id,
      appointment_id: appt.id,

      doctor_id: appt.doctor_id,

      position: currentPosition,

      patientsAhead,

      estimatedWaitMinutes,

      scheduled_time: appt.scheduled_time,

      scheduled_date: appt.scheduled_date,

      status: appt.status,

      doctor_name:
        (appt.doctors as any)?.name || 'Doctor',

      patient_name:
        (appt.patients as any)?.name || 'Patient',

      eta_status:
        (appt.patients as any)?.eta_status || 'pending',
    });

  } catch (error: any) {

    console.error(
      'Patient Status Error:',
      error
    );

    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}