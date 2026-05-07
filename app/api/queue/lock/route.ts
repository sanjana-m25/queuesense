import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';

/**
 * PATCH /api/queue/lock
 * Toggles the lock status of a queue entry.
 * 
 * Auth: Admin or Receptionist role.
 * Body: { queue_entry_id, locked: boolean }
 */
export async function PATCH(request: NextRequest) {
  // 1. Auth Check
  const auth = await requireRole(request, ['admin', 'receptionist']);
  if (auth instanceof NextResponse) return auth;

  const { queue_entry_id: entryId, locked } = await request.json();

  if (!entryId || locked === undefined) {
    return NextResponse.json({ error: 'Missing queue_entry_id or locked status' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    // 2. Fetch entry to get details for logging
    const { data: entry, error: fetchError } = await supabase
      .from('queue_entries')
      .select('appointment_id, appointments(hospital_id)')
      .eq('id', entryId)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 });
    }

    const hospitalId = (entry.appointments as any).hospital_id;
    const appointmentId = entry.appointment_id;

    // 3. Update Lock Status
    const { error: updateError } = await supabase
      .from('queue_entries')
      .update({ is_locked: locked })
      .eq('id', entryId);

    if (updateError) throw updateError;

    // 4. Insert Admin Log
    await supabase.from('admin_logs').insert({
      hospital_id: hospitalId,
      admin_user_id: auth.user.id,
      action: locked ? 'LOCK_POSITION' : 'UNLOCK_POSITION',
      target_appointment_id: appointmentId,
      metadata: { locked }
    });

    return NextResponse.json({
      queue_entry_id: entryId,
      is_locked: locked
    });

  } catch (error: any) {
    console.error('Queue Lock Error:', error);
    return NextResponse.json({ error: 'Failed to toggle lock' }, { status: 500 });
  }
}
