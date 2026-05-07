import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';

/**
 * PATCH /api/admin/settings
 * Updates hospital-level settings, such as the queue recalculation interval.
 * 
 * Auth: Admin role.
 * Body: { recalc_interval_seconds: number }
 */
export async function PATCH(request: NextRequest) {
  // 1. Auth Check
  const auth = await requireRole(request, ['admin']);
  if (auth instanceof NextResponse) return auth;

  const { recalc_interval_seconds: interval } = await request.json();

  // 2. Validation
  if (![30, 45, 60].includes(interval)) {
    return NextResponse.json({ 
      error: 'Invalid interval. Must be 30, 45, or 60 seconds.' 
    }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    // 3. Fetch the first hospital (assuming single-tenant for now)
    const { data: hospital, error: fetchError } = await supabase
      .from('hospitals')
      .select('id, settings')
      .limit(1)
      .single();

    if (fetchError || !hospital) {
      return NextResponse.json({ error: 'Hospital record not found' }, { status: 404 });
    }

    // 4. Update Hospital Settings
    // We assume a 'settings' JSONB column exists as per the PRD recommendation.
    const updatedSettings = {
      ...(hospital.settings as object || {}),
      recalc_interval_seconds: interval
    };

    const { error: updateError } = await supabase
      .from('hospitals')
      .update({ settings: updatedSettings })
      .eq('id', hospital.id);

    if (updateError) {
      // Fallback: if 'settings' column doesn't exist yet, this might error.
      // In a real scenario, a migration should have added this column.
      console.error('Update Error (possibly missing settings column):', updateError);
      throw updateError;
    }

    // 5. Log Action
    await supabase.from('admin_logs').insert({
      hospital_id: hospital.id,
      admin_user_id: auth.user.id,
      action: 'RECALC_INTERVAL_CHANGE',
      metadata: { new_interval: interval }
    });

    return NextResponse.json({ updated: true });

  } catch (error: any) {
    console.error('Admin Settings Update Error:', error);
    return NextResponse.json({ error: 'Failed to update admin settings' }, { status: 500 });
  }
}
