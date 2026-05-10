import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone || !PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: "Invalid phone format", code: "INVALID_PHONE" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const today = new Date().toISOString().split('T')[0];

    // Query appointments JOIN patients JOIN doctors JOIN queue_entries
    // Filter by phone, date >= today, status in (scheduled, in_consultation)
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        status,
        booked_via,
        doctor_id,
        patients!inner(phone),
        doctors(name),
        queue_entries(position)
      `)
      .eq("patients.phone", phone)
      .gte("scheduled_date", today)
      .in("status", ["scheduled", "in_consultation"])
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (error) {
      console.error("Error looking up appointments:", error);
      return NextResponse.json(
        { error: "Failed to lookup appointments", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    // Process results and fetch total_in_queue for each
    const formattedAppointments = await Promise.all((appointments || []).map(async (apt) => {
      // Get total in queue for this doctor on this date
      const { count: totalInQueue } = await supabase
        .from("queue_entries")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", apt.doctor_id)
        .eq("queue_date", apt.scheduled_date);

      const doctor = apt.doctors as { name: string } | null;
      const qEntries = apt.queue_entries as { position: number }[] | null;

      return {
        appointment_id: apt.id,
        doctor_name: doctor?.name || "Unknown",
        scheduled_date: apt.scheduled_date,
        scheduled_time: apt.scheduled_time,
        current_position: qEntries?.[0]?.position || null,
        total_in_queue: totalInQueue || 0,
        status: apt.status,
        booked_via: apt.booked_via
      };
    }));

    return NextResponse.json({ appointments: formattedAppointments });
  } catch (error) {
    console.error("Unexpected error in /api/booking/lookup:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
