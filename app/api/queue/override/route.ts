import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';

/**
 * PATCH /api/queue/override
 * Manually overrides a patient's position in the queue.
 * 
 * Auth: Admin or Receptionist role.
 * Body: { queue_entry_id, new_position, lock }
 */
export async function PATCH(request: NextRequest) {
  // 1. Auth Check
  const auth = await requireRole(request, ['admin', 'receptionist']);
  if (auth instanceof NextResponse) return auth;

  const { queue_entry_id: entryId, new_position: newPos, lock } = await request.json();

  if (!entryId || newPos === undefined) {
    return NextResponse.json({ error: 'Missing queue_entry_id or new_position' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    // 2. Fetch target entry to get doctor_id and date
    const { data: targetEntry, error: targetError } = await supabase
      .from('queue_entries')
      .select('*, appointments(hospital_id, patient_id)')
      .eq('id', entryId)
      .single();

    if (targetError || !targetEntry) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 });
    }

    const { doctor_id: doctorId, queue_date: date, position: oldPos } = targetEntry;
    const hospitalId = (targetEntry.appointments as any).hospital_id;
    const appointmentId = targetEntry.appointment_id;

    // 3. Fetch all entries for this doctor/date
    const { data: allEntries, error: allError } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('queue_date', date)
      .order('position', { ascending: true });

    if (allError) throw allError;

    // 4. Calculate new positions for shifting
    // Filter out the target entry, then insert it at the new position
    const otherEntries = allEntries.filter(e => e.id !== entryId);
    
    // Clamp newPos between 1 and total entries
    const validatedNewPos = Math.max(1, Math.min(newPos, allEntries.length));
    
    const reordered = [...otherEntries];
    reordered.splice(validatedNewPos - 1, 0, { 
      ...targetEntry, 
      position: validatedNewPos, 
      is_locked: lock !== undefined ? lock : targetEntry.is_locked 
    });

    // 5. Update DB (Batch Update)
    // To avoid unique constraint conflicts, we'll use a transaction-like approach:
    // Set all positions to negative temporarily, then to their new positive values.
    // PostgREST doesn't support transactions easily, so we use a series of updates.
    
    // Step A: Temporarily move everyone out of the way
    await supabase
      .from('queue_entries')
      .update({ position: -1 }) // Temporary invalid position
      .eq('doctor_id', doctorId)
      .eq('queue_date', date);

    // Step B: Set new positions
    for (let i = 0; i < reordered.length; i++) {
      const entry = reordered[i];
      await supabase
        .from('queue_entries')
        .update({ 
          position: i + 1,
          is_locked: entry.id === entryId ? (lock ?? entry.is_locked) : entry.is_locked
        })
        .eq('id', entry.id);
    }

    // 6. Insert Admin Log
    await supabase.from('admin_logs').insert({
      hospital_id: hospitalId,
      admin_user_id: auth.user.id,
      action: 'OVERRIDE_POSITION',
      target_appointment_id: appointmentId,
      metadata: {
        old_position: oldPos,
        new_position: validatedNewPos,
        locked: lock ?? targetEntry.is_locked
      }
    });

    return NextResponse.json({ 
      updated: true, 
      position: validatedNewPos, 
      is_locked: lock ?? targetEntry.is_locked 
    });

  } catch (error: any) {
    console.error('Queue Override Error:', error);
    return NextResponse.json({ error: 'Failed to override position' }, { status: 500 });
  }
}
