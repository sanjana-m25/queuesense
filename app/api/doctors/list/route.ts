import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MOCK_DOCTORS = [
  {
    id: "d1",
    name: "Arvind Rao",
    specialization: "Cardiology",
    timings: "09:00 AM - 01:00 PM",
    avg_consultation_minutes: 15
  },

  {
    id: "d2",
    name: "Meera Nair",
    specialization: "Pediatrics",
    timings: "10:00 AM - 02:00 PM",
    avg_consultation_minutes: 10
  },

  {
    id: "d3",
    name: "Samuel John",
    specialization: "Orthopedics",
    timings: "11:00 AM - 04:00 PM",
    avg_consultation_minutes: 20
  },

  {
    id: "d4",
    name: "Sneha Patil",
    specialization: "Dermatology",
    timings: "09:30 AM - 01:30 PM",
    avg_consultation_minutes: 12
  },

  {
    id: "d5",
    name: "Rajesh Kumar",
    specialization: "Neurology",
    timings: "02:00 PM - 06:00 PM",
    avg_consultation_minutes: 25
  },

  {
    id: "d6",
    name: "Priya Sharma",
    specialization: "ENT",
    timings: "08:00 AM - 12:00 PM",
    avg_consultation_minutes: 15
  },

  {
    id: "d7",
    name: "Vikram Seth",
    specialization: "General Surgery",
    timings: "01:00 PM - 05:00 PM",
    avg_consultation_minutes: 30
  },

  {
    id: "d8",
    name: "David Wilson",
    specialization: "Gynecology",
    timings: "10:30 AM - 02:30 PM",
    avg_consultation_minutes: 10
  },

  {
    id: "d9",
    name: "Ananya Iyer",
    specialization: "General Medicine",
    timings: "09:00 AM - 12:00 PM",
    avg_consultation_minutes: 20
  },
];

/**
 * GET /api/doctors/list
 * Returns a list of active doctors for the booking form.
 * Falls back to mock data if database is empty or unavailable.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: doctors, error } = await supabase
      .from("doctors")
      .select("id, name, specialization, avg_consultation_minutes")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error || !doctors || doctors.length === 0) {
      console.warn("Using mock doctor data (DB empty or error)");
      return NextResponse.json(MOCK_DOCTORS);
    }

    // Map DB doctors to include mock timings if missing
    const enhancedDoctors = doctors.map(d => ({
      ...d,
      timings: "09:00 AM - 05:00 PM" // Default timings for DB doctors
    }));

    return NextResponse.json(enhancedDoctors);
  } catch (err: any) {
    console.error("Doctor List Error:", err);
    return NextResponse.json(MOCK_DOCTORS); // Fallback on total failure
  }
}
