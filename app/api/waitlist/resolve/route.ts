import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';
import { generateConsentToken } from '@/lib/tokens';
import { sendConsentNotification } from '@/lib/notifications';

/**
 * POST /api/waitlist/resolve
 * Resolves a waitlist entry by creating an appointment and adding them to the queue.
 * 
 * Auth: Admin role.
 * Body: { waitlist_entry_id, appointment_slot_time }
 */
export async function POST(request: NextRequest) {
  // 1. Auth Check
  const auth = await requireRole(request, ['admin', 'receptionist']);
  if (auth instanceof NextResponse) return auth;

  const { waitlist_entry_id: waitlistId, appointment_slot_time: slotTime } = await request.json();

  if (!waitlistId || !slotTime) {
    return NextResponse.json({ error: 'Missing waitlist_entry_id or appointment_slot_time' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    // 2. Fetch Waitlist Entry
    const { data: waitEntry, error: fetchError } = await supabase
      .from('waitlist_entries')
      .select(`
        *,
        patients (name, phone),
        doctors (name)
      `)
      .eq('id', waitlistId)
      .single();

    if (fetchError || !waitEntry) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 });
    }

    // 3. Find the "freed" or next available position
    const { data: existingEntries } = await supabase
      .from('queue_entries')
      .select('position')
      .eq('doctor_id', waitEntry.doctor_id)
      .eq('queue_date', waitEntry.waitlist_date)
      .order('position', { ascending: true });
    
    // Simple logic: find first gap or use max + 1
    let targetPosition = 1;
    if (existingEntries && existingEntries.length > 0) {
      const positions = existingEntries.map(e => e.position);
      for (let i = 1; i <= Math.max(...positions) + 1; i++) {
        if (!positions.includes(i)) {
          targetPosition = i;
          break;
        }
      }
    }

    // 4. Create Appointment
    const { data: newAppt, error: apptError } = await supabase
      .from('appointments')
      .insert({
        hospital_id: waitEntry.hospital_id,
        doctor_id: waitEntry.doctor_id,
        patient_id: waitEntry.patient_id,
        scheduled_date: waitEntry.waitlist_date,
        scheduled_time: slotTime,
        original_position: targetPosition, // Assigning the freed position
        status: 'scheduled'
      })
      .select()
      .single();

    if (apptError) throw apptError;

    // 5. Create Queue Entry
    const { error: queueError } = await supabase
      .from('queue_entries')
      .insert({
        appointment_id: newAppt.id,
        doctor_id: waitEntry.doctor_id,
        queue_date: waitEntry.waitlist_date,
        position: targetPosition,
        is_locked: false
      });

    if (queueError) throw queueError;

    // 6. Update Waitlist Status
    await supabase
      .from('waitlist_entries')
      .update({ status: 'offered' })
      .eq('id', waitlistId);

    // 7. Notify Patient (Send Consent Token)
    const token = generateConsentToken();
    const apptDateTime = new Date(`${waitEntry.waitlist_date}T${slotTime}`);
    const expiresAt = new Date(apptDateTime.getTime() + 30 * 60000);

    await supabase.from('patient_consent_tokens').insert({
      appointment_id: newAppt.id,
      token: token,
      expires_at: expiresAt.toISOString()
    });

    await sendConsentNotification({
      patientName: (waitEntry.patients as any).name,
      phone: (waitEntry.patients as any).phone,
      doctorName: (waitEntry.doctors as any).name,
      token: token
    });

    // 8. Log Action
    await supabase.from('admin_logs').insert({
      hospital_id: waitEntry.hospital_id,
      admin_user_id: auth.user.id,
      action: 'WAITLIST_OFFER',
      target_appointment_id: newAppt.id,
      metadata: { waitlist_entry_id: waitlistId, slot_time: slotTime }
    });

    return NextResponse.json({
      resolved: true,
      new_appointment_id: newAppt.id
    });

  } catch (error: any) {
    console.error('Waitlist Resolve Error:', error);
    return NextResponse.json({ error: 'Failed to resolve waitlist entry' }, { status: 500 });
  }
}
