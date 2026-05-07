import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';

/**
 * POST /api/patients/no-show
 * Marks a patient as a no-show and finds a potential replacement from the waitlist.
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
    // 2. Fetch appointment and hospital details
    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select('hospital_id, doctor_id, scheduled_date, patient_id')
      .eq('id', appointmentId)
      .single();

    if (apptError || !appt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // 3. Update Status and Remove from Queue
    // We use a transaction-like sequence
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'no_show' })
      .eq('id', appointmentId);

    if (updateError) throw updateError;

    await supabase
      .from('queue_entries')
      .delete()
      .eq('appointment_id', appointmentId);

    // 4. Query Waitlist for Candidates
    const { data: waitlist, error: waitError } = await supabase
      .from('waitlist_entries')
      .select(`
        *,
        patients (name, phone)
      `)
      .eq('doctor_id', appt.doctor_id)
      .eq('waitlist_date', appt.scheduled_date)
      .eq('status', 'waiting');

    if (waitError) throw waitError;

    // Sort waitlist: Urgency (high > medium > low), then ETA (smallest first)
    const urgencyMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const sortedWaitlist = waitlist.sort((a, b) => {
      const urgencyDiff = urgencyMap[b.urgency_level] - urgencyMap[a.urgency_level];
      if (urgencyDiff !== 0) return urgencyDiff;
      
      // Secondary sort: ETA (nulls last)
      const etaA = a.eta_seconds ?? Infinity;
      const etaB = b.eta_seconds ?? Infinity;
      return etaA - etaB;
    });

    const candidate = sortedWaitlist.length > 0 ? {
      waitlist_entry_id: sortedWaitlist[0].id,
      patient_name: (sortedWaitlist[0].patients as any).name,
      urgency: sortedWaitlist[0].urgency_level,
      eta_seconds: sortedWaitlist[0].eta_seconds,
      eta_minutes: sortedWaitlist[0].eta_seconds ? Math.floor(sortedWaitlist[0].eta_seconds / 60) : null
    } : null;

    // 5. Log Action
    await supabase.from('admin_logs').insert({
      hospital_id: appt.hospital_id,
      admin_user_id: auth.user.id,
      action: 'MARK_NO_SHOW',
      target_appointment_id: appointmentId,
      metadata: { waitlist_replacement_available: !!candidate }
    });

    return NextResponse.json({
      marked: true,
      waitlist_candidate: candidate
    });

  } catch (error: any) {
    console.error('No-Show Error:', error);
    return NextResponse.json({ error: 'Failed to mark patient as no-show' }, { status: 500 });
  }
}
