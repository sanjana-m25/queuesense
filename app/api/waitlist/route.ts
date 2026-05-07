import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';

/**
 * GET /api/waitlist
 * Returns the current waitlist for a specific doctor and date.
 * 
 * Auth: Admin role.
 * Query Params: ?doctor_id=...&date=...
 */
export async function GET(request: NextRequest) {
  // 1. Auth Check
  const auth = await requireRole(request, ['admin', 'receptionist']);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get('doctor_id');
  const date = searchParams.get('date');

  if (!doctorId || !date) {
    return NextResponse.json({ error: 'Missing doctor_id or date' }, { status: 400 });
  }

  const supabase = await createServerClient();

  try {
    // 2. Fetch Waitlist Entries
    const { data: waitlist, error } = await supabase
      .from('waitlist_entries')
      .select(`
        *,
        patients (name, phone)
      `)
      .eq('doctor_id', doctorId)
      .eq('waitlist_date', date)
      .eq('status', 'waiting');

    if (error) throw error;

    // 3. Sort logic: urgency DESC, eta_seconds ASC (nulls last)
    const urgencyMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const sorted = waitlist.sort((a, b) => {
      const urgencyDiff = urgencyMap[b.urgency_level] - urgencyMap[a.urgency_level];
      if (urgencyDiff !== 0) return urgencyDiff;
      
      const etaA = a.eta_seconds ?? Infinity;
      const etaB = b.eta_seconds ?? Infinity;
      return etaA - etaB;
    });

    return NextResponse.json(sorted.map((entry: any) => ({
      waitlist_entry_id: entry.id,
      patient: {
        id: entry.patient_id,
        name: entry.patients?.name,
        phone: entry.patients?.phone
      },
      urgency_level: entry.urgency_level,
      eta_seconds: entry.eta_seconds,
      waitlist_date: entry.waitlist_date,
      created_at: entry.created_at
    })));

  } catch (error: any) {
    console.error('Waitlist Fetch Error:', error);
    return NextResponse.json({ error: 'Failed to fetch waitlist' }, { status: 500 });
  }
}
