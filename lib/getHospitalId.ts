import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const DEFAULT_HOSPITAL_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Utility to get the current hospital ID.
 * Falls back to a default ID in development if the database is empty.
 */
export async function getHospitalId(supabase: SupabaseClient<Database>): Promise<string> {
  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (hospital) return hospital.id;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('No hospital configured in production environment.');
  }

  console.warn('[DEV] No hospital found in DB. Using fallback.');
  const id = process.env.HOSPITAL_ID || DEFAULT_HOSPITAL_ID;
  console.log('[DEBUG] getHospitalId returning fallback:', id);
  if (!id) throw new Error('Hospital ID fallback is empty');
  return id;
}
