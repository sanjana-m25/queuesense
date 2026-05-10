import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { v4 as uuidv4 } from "uuid";
import { getHospitalId } from "@/lib/getHospitalId";
import { handleDbError } from "@/lib/handleDbError";
import { formatPhoneNumber } from "@/lib/utils";
import {
  analyzeSymptoms,
  assignDoctor,
} from "@/lib/doctor-assignment";

const IS_DEV = process.env.NODE_ENV === "development";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      preferredDoctorId,
      date,
      slotId,
      name,
      age,
      symptoms,
      phone,
    } = body;

    const formattedPhone = formatPhoneNumber(phone);

    if (!date || !name || !formattedPhone || !symptoms) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // HOSPITAL
    let hospitalId: string;

    try {
      hospitalId = await getHospitalId(supabase);
    } catch (err) {
      return handleDbError(
        "Fetch Hospital ID",
        err,
        IS_DEV
      ).response;
    }

    // ANALYZE SYMPTOMS
    const analysis = analyzeSymptoms(symptoms);

    // EMERGENCY ALERT
    if (analysis.emergency) {
      return NextResponse.json(
        {
          emergency: true,
          message:
            "Your symptoms may indicate a medical emergency. Please visit the hospital immediately or contact emergency services.",
        },
        { status: 200 }
      );
    }

    // FETCH DOCTORS
    const { data: doctors, error: doctorsError } =
      await supabase
        .from("doctors")
        .select("*")
        .eq("is_active", true);

    if (doctorsError || !doctors) {
      return NextResponse.json(
        { error: "Unable to fetch doctors" },
        { status: 500 }
      );
    }

    // ASSIGN DOCTOR
    let selectedDoctor = null;

    if (preferredDoctorId) {
      selectedDoctor = doctors.find(
        d => d.id === preferredDoctorId
      );
    } else {
      selectedDoctor = assignDoctor(
        doctors,
        analysis.specialization
      );
    }

    if (!selectedDoctor) {
      return NextResponse.json(
        { error: "No doctor available" },
        { status: 400 }
      );
    }

    // FETCH SLOT

    let slot = null;

    // IF USER CHOSE PREFERRED DOCTOR SLOT
    if (slotId) {
      const { data: selectedSlot, error: slotError } =
        await supabase
          .from("available_slots")
          .select("*")
          .eq("id", slotId)
          .eq("is_booked", false)
          .single();

      if (slotError || !selectedSlot) {
        return NextResponse.json(
          { error: "Selected slot unavailable" },
          { status: 400 }
        );
      }

      slot = selectedSlot;
    }

    // AUTO ASSIGN MODE → PICK EARLIEST SLOT
    else {
      const { data: autoSlot, error: autoSlotError } =
        await supabase
          .from("available_slots")
          .select("*")
          .eq("doctor_id", selectedDoctor.id)
          .eq("slot_date", date)
          .eq("is_booked", false)
          .order("slot_time", { ascending: true })
          .limit(1)
          .single();

      if (autoSlotError || !autoSlot) {
        return NextResponse.json(
          {
            error:
              "No slots available for assigned doctor",
          },
          { status: 400 }
        );
      }

      slot = autoSlot;
    }

    // FIND EXISTING PATIENT
    let patient = null;

    const { data: existingPatient } =
      await supabase
        .from("patients")
        .select("*")
        .eq("phone", formattedPhone)
        .maybeSingle();

    if (existingPatient) {
      patient = existingPatient;
    } else {
      const { data: newPatient, error: patientError } =
        await supabase
          .from("patients")
          .insert({
            hospital_id: hospitalId,
            name,
            phone: formattedPhone,
            age: age ? parseInt(age) : null,
            symptoms,
          })
          .select()
          .single();

      if (patientError) {
        return handleDbError(
          "Create Patient",
          patientError,
          IS_DEV
        ).response;
      }

      patient = newPatient;
    }

    // QUEUE POSITION
    const { count } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("doctor_id", selectedDoctor.id)
      .eq("scheduled_date", date);

    const queuePosition = (count || 0) + 1;

    // CREATE APPOINTMENT
    const { data: appointment, error: appointmentError } =
      await supabase
        .from("appointments")
        .insert({
          hospital_id: hospitalId,
          doctor_id: selectedDoctor.id,
          patient_id: patient.id,
          scheduled_date: date,
          scheduled_time: slot.slot_time,
          slot_id: slot.id,
          original_position: queuePosition,
          priority_level: analysis.priorityLevel,
          emergency_flag: false,
          auto_assigned: !preferredDoctorId,
          symptoms,
          booked_via: "patient",
          status: "scheduled",
        })
        .select()
        .single();

    if (appointmentError) {
      return handleDbError(
        "Create Appointment",
        appointmentError,
        IS_DEV
      ).response;
    }

    // MARK SLOT BOOKED
    await supabase
      .from("available_slots")
      .update({ is_booked: true })
      .eq("id", slot.id);

    // TOKEN
    const token = uuidv4();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await supabase
      .from("patient_consent_tokens")
      .insert({
        appointment_id: appointment.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    return NextResponse.json({
      success: true,
      token,
      redirectUrl: `/patient/status?token=${token}`,

      appointment: {
        id: appointment.id,
        doctor: selectedDoctor.name,
        specialization:
          selectedDoctor.specialization,
        slotTime: slot.slot_time,
        queuePosition,
        autoAssigned: !preferredDoctorId,
      },
    });
  } catch (err) {
    const error = err as Error;

    console.error("Booking Logic Error:", error);

    return NextResponse.json(
      {
        error: "Internal booking error",
        detail: IS_DEV ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}