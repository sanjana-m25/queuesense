import { createAdminClient } from "@/lib/supabase/admin";

export async function recalculateQueue(
  doctorId: string
) {

  const supabase = createAdminClient();

  const { data: queue, error } =
    await supabase
      .from("queue_entries")
      .select(`
    id,
    doctor_id,
    queue_position,
    dynamic_priority,
    eta_minutes,
    is_arrived
`)
      .eq("doctor_id", doctorId);

  if (error) {
    throw error;
  }

  /*
 SMART PRIORITY ENGINE
 */
  const enhancedQueue = (queue || []).map((patient: any) => {

    let score = 0;

    /*
    Base dynamic priority
    */
    score += patient.dynamic_priority || 0;

    /*
    Emergency boost
    */
    if (patient.dynamic_priority >= 90) {
      score += 100;
    }

    /*
    Arrival boost
    */
    if (patient.is_arrived) {
      score += 40;
    }

    /*
    Late patient penalty
    */
    if (
      patient.eta_minutes &&
      patient.eta_minutes > 20
    ) {
      score -= 30;
    }

    /*
    Very close to hospital
    */
    if (
      patient.eta_minutes &&
      patient.eta_minutes < 5
    ) {
      score += 20;
    }

    return {
      ...patient,
      smart_score: score
    };
  });

  /*
  Sort using smart score
  */
  const sorted = enhancedQueue.sort(
    (a, b) =>
      b.smart_score - a.smart_score
  );

  /*
  Reassign queue positions
  */
  for (let i = 0; i < sorted.length; i++) {

    await supabase
      .from("queue_entries")
      .update({
        queue_position: i + 1
      })
      .eq("id", sorted[i].id);
  }

  return sorted;
}