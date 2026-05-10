import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateConsentToken } from '@/lib/tokens';
import { sendConsentNotification } from '@/lib/notifications';

/**
 * POST /api/consent/send
 * Sends the location consent notification to a patient.
 * 
 * Auth: CRON_SECRET.
 * Body: { appointment_id }
 */
export async function POST(request: NextRequest) {
  // 1. Auth Check
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { appointment_id: appointmentId } = body;

  const supabase = createAdminClient();

  try {
    // BATCH MODE: If no appointment_id, find all due in 30-45 mins
    if (!appointmentId) {
      const now = new Date();
      // Adjust for Asia/Kolkata if server is elsewhere (optional but good practice)
      // For this implementation, we'll use UTC/Server time and assume simple offset or matches DB
      
      const todayStr = now.toISOString().split('T')[0];
      
      // Calculate window [now + 30m, now + 45m]
      const windowStart = new Date(now.getTime() + 30 * 60000);
      const windowEnd = new Date(now.getTime() + 45 * 60000);
      
      const timeToStr = (d: Date) => d.toTimeString().split(' ')[0]; // HH:MM:SS
      
      const startTimeStr = timeToStr(windowStart);
      const endTimeStr = timeToStr(windowEnd);

      const { data: appointments, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (name, phone),
          doctors (name)
        `)
        .eq('scheduled_date', todayStr)
        .gte('scheduled_time', startTimeStr)
        .lte('scheduled_time', endTimeStr)
        .is('consent_notified_at', null)
        .eq('status', 'scheduled');
        // booked_via is intentionally not filtered — covers both admin and self-booked

      if (fetchError) throw fetchError;

      let sentCount = 0;
      let failedCount = 0;

      for (const appt of appointments || []) {
        const token = generateConsentToken();
        const apptDateTime = new Date(`${appt.scheduled_date}T${appt.scheduled_time}`);
        const expiresAt = new Date(apptDateTime.getTime() + 30 * 60000);

        const { error: tokenError } = await supabase
          .from('patient_consent_tokens')
          .insert({
            appointment_id: appt.id,
            token: token,
            expires_at: expiresAt.toISOString()
          });

        if (tokenError) {
          console.error(`Failed to create token for appt ${appt.id}:`, tokenError);
          failedCount++;
          continue;
        }

        const sent = await sendConsentNotification({
          patientName: (appt.patients as any).name,
          phone: (appt.patients as any).phone,
          doctorName: (appt.doctors as any).name,
          token: token
        });

        if (sent) {
          await supabase
            .from('appointments')
            .update({ consent_notified_at: new Date().toISOString() })
            .eq('id', appt.id);
          sentCount++;
        } else {
          failedCount++;
        }
      }

      return NextResponse.json({ 
        batch: true,
        sent_count: sentCount, 
        failed_count: failedCount 
      });
    }

    // SINGLE MODE: Original logic from TASK-029
    // ... logic remains but we need to fetch the appt first (re-using part of old logic)
    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (name, phone),
        doctors (name)
      `)
      .eq('id', appointmentId)
      .single();

    if (apptError || !appt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (appt.consent_notified_at) {
      return NextResponse.json({ error: 'Notification already sent' }, { status: 409 });
    }

    const token = generateConsentToken();
    const apptDateTime = new Date(`${appt.scheduled_date}T${appt.scheduled_time}`);
    const expiresAt = new Date(apptDateTime.getTime() + 30 * 60000);

    const { error: tokenError } = await supabase
      .from('patient_consent_tokens')
      .insert({
        appointment_id: appointmentId,
        token: token,
        expires_at: expiresAt.toISOString()
      });

    if (tokenError) throw tokenError;

    const sent = await sendConsentNotification({
      patientName: (appt.patients as any).name,
      phone: (appt.patients as any).phone,
      doctorName: (appt.doctors as any).name,
      token: token
    });

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }

    await supabase
      .from('appointments')
      .update({ consent_notified_at: new Date().toISOString() })
      .eq('id', appointmentId);

    return NextResponse.json({ 
      sent: true, 
      channel: process.env.WATI_API_KEY ? 'whatsapp' : 'sms' 
    });

  } catch (error: any) {
    console.error('Consent Send Error:', error);
    return NextResponse.json({ error: 'Failed to send consent notification' }, { status: 500 });
  }
}
