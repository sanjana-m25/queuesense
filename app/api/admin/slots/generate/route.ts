import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const auth = await requireRole(request, ["admin", "receptionist"]);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { doctor_id, date, start_time, end_time, duration_minutes, break_times = [] } = body;

    if (!doctor_id || !date || !start_time || !end_time || !duration_minutes) {
      return NextResponse.json(
        { error: "Missing required fields", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Fetch doctor's hospital_id
    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("hospital_id")
      .eq("id", doctor_id)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: "Doctor not found", code: "DOCTOR_NOT_FOUND" },
        { status: 404 }
      );
    }

    const hospital_id = doctor.hospital_id;

    // Helper to convert "HH:MM" to minutes from midnight
    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    // Helper to convert minutes to "HH:MM:SS"
    const fromMinutes = (m: number) => {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}:00`;
    };

    const start = toMinutes(start_time);
    const end = toMinutes(end_time);
    const breakMinutes = break_times.map(toMinutes);

    const slotsToCreate = [];
    for (let time = start; time < end; time += duration_minutes) {
      if (breakMinutes.includes(time)) continue;

      slotsToCreate.push({
        hospital_id,
        doctor_id,
        slot_date: date,
        slot_time: fromMinutes(time),
        duration_minutes,
        is_booked: false
      });
    }

    if (slotsToCreate.length === 0) {
      return NextResponse.json({ generated: 0, skipped: 0, slots: [] });
    }

    // Insert with ON CONFLICT DO NOTHING
    // In Supabase JS, we use upsert with ignoreDuplicates: true
    const { data, error } = await supabase
      .from("available_slots")
      .upsert(slotsToCreate, { 
        onConflict: "doctor_id,slot_date,slot_time",
        ignoreDuplicates: true 
      })
      .select("id, slot_time");

    if (error) {
      console.error("Error generating slots:", error);
      return NextResponse.json(
        { error: "Failed to generate slots", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    const generatedSlots = data || [];
    const generatedCount = generatedSlots.length;
    const skippedCount = slotsToCreate.length - generatedCount;

    return NextResponse.json({
      generated: generatedCount,
      skipped: skippedCount,
      slots: generatedSlots.map(s => ({
        slot_id: s.id,
        slot_time: s.slot_time
      }))
    });
  } catch (error) {
    console.error("Unexpected error in /api/admin/slots/generate:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
