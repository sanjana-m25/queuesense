import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';

/**
 * GET /api/queue
 * Returns the current queue for a specific doctor and date.
 * 
 * Query Params:
 *  - doctor_id: UUID
 *  - date: YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  // 1. Auth Check (Admin or Doctor)
  const auth = await requireRole(request, ['admin', 'doctor', 'receptionist']);
  if (auth instanceof NextResponse) return auth;

  // 2. Parse Query Params
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get('doctor_id');
  const date = searchParams.get('date');

  if (!doctorId) {
    return NextResponse.json({ error: 'Missing doctor_id' }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: 'Missing date' }, { status: 400 });
  }

  const supabase = await createServerClient();

  // 3. Query Database
  // We join queue_entries -> appointments -> patients
  const { data, error } = await supabase
    .from('queue_entries')
    .select(`
      queue_entry_id:id,
      position,
      appointment_id,
      is_locked,
      last_recalc_at,
      appointments (
        appointment_status:status,
        scheduled_time,
        patient:patients (
          id,
          name,
          phone,
          eta_status,
          eta_seconds
        )
      )
    `)
    .eq('doctor_id', doctorId)
    .eq('queue_date', date)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching queue:', error);
    return NextResponse.json({ error: 'Failed to fetch queue data' }, { status: 500 });
  }

  // 4. Transform to target JSON shape
  const lastRecalcAt = data.length > 0 ? data[0].last_recalc_at : null;
  const recalcInterval = parseInt(process.env.QUEUE_RECALC_INTERVAL_SECONDS || '45', 10);

  const formattedQueue = data.map((entry: any) => {
    const appt = entry.appointments;
    const patient = appt?.patient;

    return {
      queue_entry_id: entry.queue_entry_id,
      position: entry.position,
      appointment_id: entry.appointment_id,
      patient: {
        id: patient?.id,
        name: patient?.name,
        phone: patient?.phone,
      },
      scheduled_time: appt?.scheduled_time?.substring(0, 5) || '', // HH:MM
      eta_status: patient?.eta_status || 'uncertain',
      eta_seconds: patient?.eta_seconds || null,
      eta_minutes: patient?.eta_seconds ? Math.floor(patient.eta_seconds / 60) : null,
      is_locked: entry.is_locked,
      appointment_status: appt?.appointment_status || 'scheduled'
    };
  });

  return NextResponse.json({
    doctor_id: doctorId,
    date: date,
    last_recalculated_at: lastRecalcAt,
    recalc_interval_seconds: recalcInterval,
    queue: formattedQueue
  });
}
