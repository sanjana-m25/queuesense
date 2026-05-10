"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Users,
  Clock,
  Stethoscope,
  Loader2,
  CheckCircle2,
  Activity,
  TimerReset,
  ShieldAlert,
} from "lucide-react";

interface PositionDisplayProps {
  token: string;
}

export default function PositionDisplay({
  token,
}: PositionDisplayProps) {

  const [data, setData] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const fetchStatus = async () => {
    try {

      // IMPORTANT:
      // Your actual API route is:
      // /api/patient/status
      const res = await fetch(
        `/api/patient/status?token=${token}`,
        {
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch queue status");
      }

      const json = await res.json();
      console.log(json);

      setData(json);

      setLastUpdated(new Date());

      setError(null);

    } catch (err: any) {

      console.error(err);

      setError(err.message);

    } finally {

      setLoading(false);
    }
  };

  useEffect(() => {

    fetchStatus();

    // Auto refresh every 5 seconds
    const interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval);

  }, [token]);
  /*
========================================
LIVE GPS TRACKING
========================================
*/

  useEffect(() => {

    /*
    Wait until patient data loads
    */
    if (
      !data?.patient_id ||
      !data?.doctor_id
    ) {
      return;
    }

    /*
    Browser location support check
    */
    if (!navigator.geolocation) {

      console.warn(
        "Geolocation not supported"
      );

      return;
    }

    /*
    Start watching location
    */
    const watchId =
      navigator.geolocation.watchPosition(

        async (position) => {

          try {

            const lat =
              position.coords.latitude;

            const lng =
              position.coords.longitude;

            /*
            TEMP MOCK ETA LOGIC
            */
            const eta_minutes =
              Math.floor(
                Math.random() * 20
              ) + 1;

            /*
            Send live location
            */
            await fetch(
              "/api/patient/location",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body: JSON.stringify({

                  appointment_id:
                    data.appointment_id,

                  patient_id:
                    data.patient_id,

                  doctor_id:
                    data.doctor_id,

                  lat,
                  lng,

                  eta_minutes
                })
              }
            );

            console.log(
              "Location updated"
            );

          } catch (err) {

            console.error(
              "Location update failed",
              err
            );
          }
        },

        /*
        Error callback
        */
        (err) => {

          console.error(
            "GPS error",
            err
          );
        },

        /*
        GPS settings
        */
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000
        }
      );

    /*
    Cleanup
    */
    return () => {

      navigator.geolocation.clearWatch(
        watchId
      );
    };

  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />

        <p className="text-zinc-500">
          Connecting to live hospital queue...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="border-rose-200 bg-rose-50 p-6 text-center">
        <p className="text-rose-700 font-medium">
          Unable to load your queue status.
        </p>

        <p className="text-sm text-rose-500 mt-2">
          Please refresh or try again later.
        </p>
      </Card>
    );
  }

  const isArrived =
    data?.eta_status === "arrived";

  const position =
    data?.position !== null &&
      data?.position !== undefined
      ? data.position
      : "--";

  return (
    <div className="w-full max-w-md space-y-5">

      {/* Main Queue Card */}
      <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-2xl">

        {/* Header */}
        <div className="bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 px-6 py-8 text-center">

          {isArrived ? (
            <div className="space-y-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />

              <h1 className="text-3xl font-black">
                You Have Arrived
              </h1>

              <p className="opacity-70">
                Please proceed to reception.
              </p>
            </div>
          ) : (
            <>
              <p className="uppercase tracking-[0.3em] text-xs opacity-60 font-bold mb-3">
                Live Queue Position
              </p>

              <h1 className="text-7xl font-black tracking-tight">
                #{position}
              </h1>

              <div className="flex items-center justify-center gap-2 mt-3 text-sm opacity-80">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />

                Real-Time Queue Tracking Active
              </div>
            </>
          )}
        </div>

        {/* Body */}
        <CardContent className="p-6 space-y-5">

          {/* Queue Metrics */}
          {!isArrived && (
            <div className="grid grid-cols-2 gap-4">

              <div className="rounded-2xl border bg-zinc-50 dark:bg-zinc-900 p-4">

                <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase mb-2">
                  <Users className="w-4 h-4" />
                  Patients Ahead
                </div>

                <div className="text-3xl font-black">
                  {data?.patientsAhead ?? "--"}
                </div>

              </div>

              <div className="rounded-2xl border bg-zinc-50 dark:bg-zinc-900 p-4">

                <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase mb-2">
                  <TimerReset className="w-4 h-4" />
                  Estimated Wait
                </div>

                <div className="text-3xl font-black">
                  {data?.estimatedWaitMinutes ?? "--"}m
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Expected at{" "}
                  {new Date(
                    Date.now() +
                    (data?.estimatedWaitMinutes || 0) * 60000
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

              </div>

            </div>
          )}

          {/* Doctor Info */}
          <div className="space-y-4">

            <div className="flex items-center justify-between p-4 rounded-2xl border bg-white dark:bg-zinc-900">

              <div className="flex items-center gap-3">
                <Stethoscope className="w-5 h-5 text-zinc-400" />

                <div>
                  <p className="text-xs uppercase text-zinc-500 font-bold">
                    Doctor
                  </p>

                  <p className="font-semibold">
                    Dr. {data?.doctor_name || "Assigned Doctor"}
                  </p>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border bg-white dark:bg-zinc-900">

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-zinc-400" />

                <div>
                  <p className="text-xs uppercase text-zinc-500 font-bold">
                    Booked Slot
                  </p>

                  <p className="font-semibold">
                    {data?.scheduled_date
                      ? new Date(data.scheduled_date).toLocaleDateString("en-GB")
                      : "--"}{" "}
                    {data?.scheduled_time || ""}
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* Smart Queue Notice */}
          {!isArrived && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-4">

              <div className="flex gap-3">

                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />

                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    Smart Queue Adjustment Enabled
                  </p>

                  <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                    Queue positions may dynamically change
                    based on emergency priority,
                    patient arrival,
                    and doctor availability.
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* Footer */}
          <div className="pt-2 flex items-center justify-between text-xs text-zinc-500">

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

              Live Sync Active
            </div>

            <div>
              Updated{" "}
              {lastUpdated
                ? lastUpdated.toLocaleTimeString()
                : "--"}
            </div>

          </div>

        </CardContent>
      </Card>
    </div>
  );
}