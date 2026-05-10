import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendConsentNotification, sendBookingConfirmation } from "@/lib/notifications";

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slot_id, patient_name, patient_phone, hospital_id } = body;

    // 1. Validation
    if (!patient_phone || !PHONE_REGEX.test(patient_phone)) {
      return NextResponse.json(
        { error: "Invalid phone format. Must be E.164 (e.g., +919876543210)", code: "INVALID_PHONE" },
        { status: 400 }
      );
    }
    if (!patient_name || patient_name.length < 2 || patient_name.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 2 and 100 characters", code: "INVALID_NAME" },
        { status: 400 }
      );
    }
    if (!slot_id || !hospital_id) {
      return NextResponse.json(
        { error: "slot_id and hospital_id are required", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Re-fetch available_slots by slot_id, confirm is_booked=FALSE
    const { data: slot, error: slotError } = await supabase
      .from("available_slots")
      .select("*, doctors(name)")
      .eq("id", slot_id)
      .single();

    if (slotError || !slot) {
      return NextResponse.json(
        { error: "Slot not found", code: "SLOT_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (slot.is_booked) {
      return NextResponse.json(
        { error: "Slot no longer available", code: "SLOT_TAKEN" },
        { status: 409 }
      );
    }

    const doctor_id = slot.doctor_id;
    const slot_date = slot.slot_date;
    const slot_time = slot.slot_time;
    const doctor_name = (slot.doctors as { name: string } | null)?.name || "Doctor";

    // Upsert patient based on phone and hospital_id
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .upsert(
        { 
          phone: patient_phone, 
          hospital_id: hospital_id, 
          name: patient_name,
          is_self_registered: true
        }, 
        { onConflict: 'phone,hospital_id' } // <--- This MUST match the SQL constraint above
      )
      .select('id')
      .single();

    if (patientError) throw patientError;

    const patient_id = patient.id;

    // 3. Count existing non-cancelled appointments for same doctor+date, add 1 for original_position
    const { count, error: countError } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("doctor_id", doctor_id)
      .eq("scheduled_date", slot_date)
      .neq("status", "cancelled");

    if (countError) {
      console.error("Error counting appointments:", countError);
      return NextResponse.json(
        { error: "Failed to calculate queue position", code: "COUNT_ERROR" },
        { status: 500 }
      );
    }

    const original_position = (count || 0) + 1;

    // 4. INSERT appointments
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        hospital_id,
        doctor_id,
        patient_id,
        scheduled_date: slot_date,
        scheduled_time: slot_time,
        original_position,
        booked_via: 'patient',
        status: 'scheduled'
      })
      .select("id")
      .single();

    if (appointmentError) {
      console.error("Error creating appointment:", appointmentError);
      return NextResponse.json(
        { error: "Failed to create appointment", code: "APPOINTMENT_INSERT_ERROR" },
        { status: 500 }
      );
    }

    const appointment_id = appointment.id;

    // 5. INSERT queue_entries
    const { error: queueError } = await supabase
      .from("queue_entries")
      .insert({
        appointment_id,
        doctor_id,
        queue_date: slot_date,
        position: original_position,
        is_locked: false
      });

    if (queueError) {
      console.error("Error creating queue entry:", queueError);
      // Rollback logic would be better here, but we'll follow requested steps
      return NextResponse.json(
        { error: "Failed to enter queue", code: "QUEUE_INSERT_ERROR" },
        { status: 500 }
      );
    }

    // 6. UPDATE available_slots SET is_booked=TRUE, appointment_id=new_appointment_id
    const { error: slotUpdateError } = await supabase
      .from("available_slots")
      .update({
        is_booked: true,
        appointment_id: appointment_id
      })
      .eq("id", slot_id);

    if (slotUpdateError) {
      console.error("Error updating slot:", slotUpdateError);
      return NextResponse.json(
        { error: "Failed to confirm slot", code: "SLOT_UPDATE_ERROR" },
        { status: 500 }
      );
    }

    try {
      await sendBookingConfirmation({
        patientName: patient_name,
        phone: patient_phone,
        doctorName: doctor_name,
        scheduledDate: slot_date,
        scheduledTime: slot_time,
        position: original_position
      });
    } catch (smsError) {
      // If SMS fails: log error but do NOT fail the booking as requested.
      console.error("SMS notification failed:", smsError);
    }

    return NextResponse.json({
      success: true,
      appointment_id,
      patient_id,
      position: original_position,
      scheduled_time: slot_time,
      scheduled_date: slot_date,
      doctor_name,
      message: "Appointment booked!"
    });
  } catch (error) {
    console.error("Unexpected error in /api/booking/create:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
