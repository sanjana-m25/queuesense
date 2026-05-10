import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sortQueue } from '@/lib/queue-engine';
import { QueueEntry, PatientEtaStatus } from '@/types/app';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

/**
 * POST /api/queue/recalculate
 * Core queue engine endpoint. Typically called by a Vercel Cron job.
 * 
 * Auth: CRON_SECRET in Authorization header.
 * Body: { doctor_id, date }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // 1. Auth Check (Cron Secret)
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { doctor_id: doctorId, date: providedDate } = body;
  const date = providedDate || new Date().toISOString().split('T')[0];

  const supabase = createAdminClient();

  try {
    // BATCH MODE: If no doctor_id, find all active doctors for today
    if (!doctorId) {
      const { data: activeDoctors, error: doctorsError } = await supabase
        .from('doctors')
        .select('id')
        .eq('is_active', true);

      if (doctorsError) throw doctorsError;

      let recalculatedCount = 0;
      for (const doc of activeDoctors || []) {
        // Trigger recalculation for each doctor (we reuse the same logic or just call it)
        // For simplicity, we'll iterate. In production, this could be parallelized.
        await runRecalculate(doc.id, date, supabase);
        recalculatedCount++;
      }

      return NextResponse.json({
        recalculated: true,
        batch: true,
        doctors_processed: recalculatedCount,
        duration_ms: Date.now() - startTime
      });
    }

    // SINGLE MODE
    const result = await runRecalculate(doctorId, date, supabase);
    return NextResponse.json({
      ...result,
      duration_ms: Date.now() - startTime
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Queue Recalculation Error:', err);
    return NextResponse.json({ 
      error: 'Failed to recalculate queue',
      details: err.message 
    }, { status: 500 });
  }
}

async function runRecalculate(doctorId: string, date: string, supabase: SupabaseClient<Database>) {
    // 2. Fetch active appointments and current queue entries
    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_time,
        scheduled_date,
        status,
        patients (
          id,
          name,
          phone,
          eta_status,
          eta_seconds
        )
      `)
      .eq('doctor_id', doctorId)
      .eq('scheduled_date', date)
      .in('status', ['scheduled', 'in_consultation']);
      // booked_via is intentionally not filtered — covers both admin and self-booked

    if (apptError) throw apptError;
    if (!appointments || appointments.length === 0) return { recalculated: false, patients_sorted: 0 };

    const { data: queueEntries, error: queueError } = await supabase
      .from('queue_entries')
      .select('appointment_id, position, is_locked, last_recalc_at')
      .eq('doctor_id', doctorId)
      .eq('queue_date', date);

    if (queueError) throw queueError;

    // 3. Map to QueueEntry[] for the sort engine
    const mappedEntries: QueueEntry[] = appointments.map((appt) => {
      const qEntry = (queueEntries as { id: string; appointment_id: string; position: number; is_locked: boolean | null; last_recalc_at: string | null }[]).find((q) => q.appointment_id === appt.id);
      const patient = (appt as { patients: { id: string, name: string, phone: string, eta_status: string, eta_seconds: number | null } | null }).patients;

      return {
        queue_entry_id: qEntry?.id || '',
        position: qEntry?.position || 999,
        appointment_id: appt.id,
        is_locked: qEntry?.is_locked || false,
        last_recalc_at: qEntry?.last_recalc_at || null,
        patient: {
          id: patient?.id || '',
          name: patient?.name || '',
          phone: patient?.phone || ''
        },
        scheduled_time: appt.scheduled_time,
        scheduled_date: appt.scheduled_date,
        eta_status: (patient?.eta_status as PatientEtaStatus) || 'uncertain',
        eta_seconds: patient?.eta_seconds || null,
        eta_minutes: patient?.eta_seconds ? Math.floor(patient.eta_seconds / 60) : null,
        appointment_status: appt.status
      };
    });

    const sorted = sortQueue(mappedEntries);
    const lastRecalcAt = new Date().toISOString();

    await supabase
      .from('queue_entries')
      .delete()
      .eq('doctor_id', doctorId)
      .eq('queue_date', date);

    const rowsToInsert = sorted.map(s => ({
      appointment_id: s.appointment_id,
      doctor_id: doctorId,
      queue_date: date,
      position: s.position,
      is_locked: s.is_locked,
      last_recalc_at: lastRecalcAt
    }));

    if (rowsToInsert.length > 0) {
      await supabase.from('queue_entries').insert(rowsToInsert);
    }
    
    return { recalculated: true, patients_sorted: sorted.length };
}
