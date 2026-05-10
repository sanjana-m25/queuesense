import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointment_id, patient_phone } = body;

    if (!appointment_id || !patient_phone) {
      return NextResponse.json(
        { error: "appointment_id and patient_phone are required", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch appointment and patient info
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("*, patients(phone)")
      .eq("id", appointment_id)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json(
        { error: "Appointment not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Confirm ownership
    if ((appointment.patients as { phone: string } | null)?.phone !== patient_phone) {
      return NextResponse.json(
        { error: "Forbidden: Phone number mismatch", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Check cancellation window: scheduled_date >= today AND scheduled_time > now() + 2 hours
    const scheduledDateTime = new Date(`${appointment.scheduled_date}T${appointment.scheduled_time}`);
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    if (scheduledDateTime < twoHoursFromNow) {
      return NextResponse.json(
        { 
          error: "Cancellation window closed. Appointments can only be cancelled at least 2 hours in advance.", 
          code: "TOO_LATE" 
        },
        { status: 400 }
      );
    }

    // Perform cancellation steps
    // 1. Update appointment status
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status: 'cancelled' })
      .eq("id", appointment_id);

    if (updateError) {
      throw new Error("Failed to update appointment status");
    }

    // 2. Delete from queue_entries
    const { error: queueDeleteError } = await supabase
      .from("queue_entries")
      .delete()
      .eq("appointment_id", appointment_id);

    if (queueDeleteError) {
      console.error("Warning: Failed to delete queue entry during cancellation", queueDeleteError);
    }

    // 3. Free the slot
    const { error: slotUpdateError } = await supabase
      .from("available_slots")
      .update({ is_booked: false, appointment_id: null })
      .eq("appointment_id", appointment_id);

    if (slotUpdateError) {
      console.error("Warning: Failed to free available slot during cancellation", slotUpdateError);
    }

    return NextResponse.json({ cancelled: true });
  } catch (error) {
    console.error("Unexpected error in /api/booking/cancel:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
