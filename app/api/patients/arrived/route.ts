import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';

/**
 * POST /api/patients/arrived
 * Marks a patient as physically arrived at the clinic.
 * 
 * Auth: Admin or Receptionist role.
 * Body: { appointment_id }
 */
export async function POST(request: NextRequest) {
  // 1. Auth Check
  const auth = await requireRole(request, ['admin', 'receptionist']);
  if (auth instanceof NextResponse) return auth;

  const { appointment_id: appointmentId } = await request.json();

  if (!appointmentId) {
    return NextResponse.json({ error: 'Missing appointment_id' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    // 2. Fetch appointment to get patient_id and hospital_id
    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select('patient_id, hospital_id, arrived_at')
      .eq('id', appointmentId)
      .single();

    if (apptError || !appt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // 3. Handle Idempotency
    if (appt.arrived_at) {
      return NextResponse.json({ 
        arrived: true, 
        arrived_at: appt.arrived_at 
      });
    }

    const arrivedAt = new Date().toISOString();

    // 4. Update Status (Patient and Appointment)
    await supabase
      .from('patients')
      .update({ eta_status: 'arrived' })
      .eq('id', appt.patient_id);

    await supabase
      .from('appointments')
      .update({ arrived_at: arrivedAt })
      .eq('id', appointmentId);

    // 5. Log Action
    await supabase.from('admin_logs').insert({
      hospital_id: appt.hospital_id,
      admin_user_id: auth.user.id,
      action: 'MARK_ARRIVED',
      target_appointment_id: appointmentId
    });

    return NextResponse.json({
      arrived: true,
      arrived_at: arrivedAt
    });

  } catch (error: any) {
    console.error('Arrived Status Error:', error);
    return NextResponse.json({ error: 'Failed to mark patient as arrived' }, { status: 500 });
  }
}
