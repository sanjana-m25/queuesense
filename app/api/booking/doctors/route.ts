import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospital_id = searchParams.get("hospital_id");

    if (!hospital_id) {
      return NextResponse.json(
        { error: "hospital_id is required", code: "MISSING_HOSPITAL_ID" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    
    const { data: doctors, error } = await supabase
      .from("doctors")
      .select("id, name, specialty, avg_consultation_minutes")
      .eq("hospital_id", hospital_id)
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching doctors:", error);
      return NextResponse.json(
        { error: "Failed to fetch doctors", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ doctors });
  } catch (error) {
    console.error("Unexpected error in /api/booking/doctors:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
