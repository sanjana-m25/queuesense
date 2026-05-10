import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

import { detectArrival } from "@/lib/location-utils";

import { recalculateQueue } from "@/lib/queue-engine";
export async function POST(
    request: NextRequest
) {

    try {

        const body = await request.json();

        const {
            appointment_id,
            patient_id,
            doctor_id,
            lat,
            lng,
            eta_minutes
        } = body;
        const supabase =
            createAdminClient();

        /*
        Detect arrival
        */
        const is_arrived =
            detectArrival(eta_minutes);

        /*
        Update patient location
        */
        const { error } = await supabase
            .from("patient_locations")
            .upsert({

                appointment_id,

                patient_id,
                lat,
                lng,
                eta_minutes,
                is_arrived,
                updated_at:
                    new Date().toISOString()
            });

        if (error) {
            throw error;
        }
        /*
Sync queue entry
*/
        await supabase
            .from("queue_entries")
            .update({
                eta_minutes,
                is_arrived
            })
            .eq("appointment_id", appointment_id);

        /*
        Recalculate adaptive queue
        */
        await recalculateQueue(
            doctor_id
        );

        return NextResponse.json({
            success: true
        });

    } catch (err: any) {

        console.error(err);

        return NextResponse.json(
            {
                error: err.message
            },
            {
                status: 500
            }
        );
    }
}