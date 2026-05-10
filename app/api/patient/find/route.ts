import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPhoneNumber } from "@/lib/utils";

/**
 * POST /api/patient/find
 * Helps patients find their appointment and live tracking link using their phone number.
 */
export async function POST(request: NextRequest) {
  try {
    let { phone } = await request.json();
    phone = formatPhoneNumber(phone);

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Find the patient and their appointment for today
    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select(`
        id,
        patient_id,
        patients!inner (
          phone
        )
      `)
      .eq("scheduled_date", today)
      .eq("patients.phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (apptError || !appointment) {
      return NextResponse.json({ error: "No appointment found for today with this phone number." }, { status: 404 });
    }

    // 2. Look up the most recent consent token for this appointment
    const { data: tokenData, error: tokenError } = await supabase
      .from("patient_consent_tokens")
      .select("token")
      .eq("appointment_id", appointment.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: "No tracking link available. Please check your SMS or contact the clinic." }, { status: 404 });
    }

    return NextResponse.json({ 
      token: tokenData.token,
      redirectUrl: `/patient/status?token=${tokenData.token}`
    });

  } catch (err: any) {
    console.error("Patient Find Error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
