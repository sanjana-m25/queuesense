import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';

/**
 * GET /api/admin/logs
 * Returns a paginated list of administrative actions for audit purposes.
 * 
 * Auth: Admin role.
 * Query Params: ?date=...&limit=50&offset=0
 */
export async function GET(request: NextRequest) {
  // 1. Auth Check
  const auth = await requireRole(request, ['admin']);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const supabase = createAdminClient();

  try {
    // 2. Build Query
    let query = supabase
      .from('admin_logs')
      .select(`
        *,
        appointments (
          patients (name)
        )
      `, { count: 'exact' });

    if (date) {
      // Filter by date (admin_logs.created_at is timestamptz)
      query = query
        .gte('created_at', `${date}T00:00:00Z`)
        .lte('created_at', `${date}T23:59:59Z`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Note: Joining auth.users directly via PostgREST might require specific DB views.
    // If it's not possible, we'd need to fetch user emails separately via auth.admin.getUser()
    // For this implementation, we'll return what's available and assume the join works if the schema allows.
    
    return NextResponse.json({
      logs: data.map((log: any) => ({
        id: log.id,
        admin_user_id: log.admin_user_id,
        action: log.action,
        target_patient_name: log.appointments?.patients?.name || 'N/A',
        metadata: log.metadata,
        created_at: log.created_at
      })),
      total_count: count || 0
    });

  } catch (error: any) {
    console.error('Logs Fetch Error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin logs' }, { status: 500 });
  }
}
