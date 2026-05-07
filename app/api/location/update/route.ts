import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateConsentToken } from '@/lib/tokens';
import { getEtaSeconds } from '@/lib/eta';

/**
 * POST /api/location/update
 * Updates patient's current location and recalculates ETA.
 * 
 * Query Params: ?token=...
 * Body: { lat, lng, accuracy }
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  // 1. Validate Token
  const validation = await validateConsentToken(token);
  if (!validation.valid || !validation.appointmentId) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { lat, lng, accuracy } = await request.json();

  // 2. Validate Coordinates
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates', code: 'INVALID_COORDS' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    // 3. Get Appointment and Patient info
    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select('patient_id, doctor_id, scheduled_date')
      .eq('id', validation.appointmentId)
      .single();

    if (apptError || !appt) throw new Error('Appointment not found');

    const patientId = appt.patient_id;

    // 4. Get ETA from Google Maps
    const etaSeconds = await getEtaSeconds(lat, lng);
    const etaStatus = etaSeconds !== null ? 'known' : 'uncertain';

    // 5. Save location entry
    const { error: locError } = await supabase
      .from('patient_locations')
      .insert({
        patient_id: patientId,
        appointment_id: validation.appointmentId,
        lat,
        lng,
        accuracy_meters: accuracy,
        eta_seconds: etaSeconds
      });

    if (locError) throw locError;

    // 6. Update patient record
    await supabase
      .from('patients')
      .update({
        eta_seconds: etaSeconds,
        eta_status: etaStatus,
        eta_updated_at: new Date().toISOString()
      })
      .eq('id', patientId);

    // 7. Get current queue position
    const { data: qEntry, error: qError } = await supabase
      .from('queue_entries')
      .select('position')
      .eq('appointment_id', validation.appointmentId)
      .single();

    return NextResponse.json({
      eta_seconds: etaSeconds,
      eta_minutes: etaSeconds !== null ? Math.floor(etaSeconds / 60) : null,
      queue_position: qEntry?.position || null
    });

  } catch (error: any) {
    console.error('Location Update Error:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}
