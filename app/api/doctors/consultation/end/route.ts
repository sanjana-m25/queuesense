import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';

/**
 * POST /api/doctors/consultation/end
 * Marks the end of a patient consultation and triggers rolling average calculation.
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
    // 2. Fetch consultation info to calculate duration
    const { data: consult, error: fetchError } = await supabase
      .from('consultations')
      .select('*, appointments(doctor_id)')
      .eq('appointment_id', appointmentId)
      .is('ended_at', null)
      .single();

    if (fetchError || !consult) {
      return NextResponse.json({ error: 'Active consultation not found' }, { status: 404 });
    }

    const endedAt = new Date();
    const startedAt = new Date(consult.started_at);
    const durationMinutes = (endedAt.getTime() - startedAt.getTime()) / 60000;
    const doctorId = (consult.appointments as any).doctor_id;

    // 3. Update Consultation and Appointment
    const { error: updateConsultError } = await supabase
      .from('consultations')
      .update({ 
        ended_at: endedAt.toISOString(),
        duration_minutes: durationMinutes
      })
      .eq('id', consult.id);

    if (updateConsultError) throw updateConsultError;

    const { error: updateApptError } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId);

    if (updateApptError) throw updateApptError;

    // 4. Fetch the updated average consultation minutes (updated by DB trigger)
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('avg_consultation_minutes')
      .eq('id', doctorId)
      .single();

    return NextResponse.json({
      ended_at: endedAt.toISOString(),
      duration_minutes: parseFloat(durationMinutes.toFixed(2)),
      new_avg_minutes: doctor?.avg_consultation_minutes || null
    });

  } catch (error: any) {
    console.error('Consultation End Error:', error);
    return NextResponse.json({ error: 'Failed to end consultation' }, { status: 500 });
  }
}
