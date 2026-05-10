import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctor_id = searchParams.get("doctor_id");
    const dateStr = searchParams.get("date") || new Date().toISOString().split('T')[0];

    if (!doctor_id) {
      return NextResponse.json(
        { error: "doctor_id is required", code: "MISSING_DOCTOR_ID" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Fetch doctor info
    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id, name, specialty")
      .eq("id", doctor_id)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: "Doctor not found", code: "DOCTOR_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Fetch available slots
    const { data: slots, error: slotsError } = await supabase
      .from("available_slots")
      .select("id, slot_time, duration_minutes")
      .eq("doctor_id", doctor_id)
      .eq("slot_date", dateStr)
      .eq("is_booked", false)
      .order("slot_time", { ascending: true });

    if (slotsError) {
      console.error("Error fetching slots:", slotsError);
      return NextResponse.json(
        { error: "Failed to fetch slots", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    // Map DB fields to requested response format
    const formattedSlots = slots.map(s => ({
      slot_id: s.id,
      slot_time: s.slot_time,
      duration_minutes: s.duration_minutes
    }));

    return NextResponse.json({
      doctor,
      date: dateStr,
      slots: formattedSlots
    });
  } catch (error) {
    console.error("Unexpected error in /api/booking/slots:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
