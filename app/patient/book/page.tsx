"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Calendar,
  Stethoscope,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BookAppointmentPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [doctors, setDoctors] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);

  const [selectedDoctor, setSelectedDoctor] =
    useState("");

  const [preferredDoctor, setPreferredDoctor] =
    useState(false);

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    phone: "",
    symptoms: "",
    date: new Date().toISOString().split("T")[0],
    slotId: "",
  });

  // LOAD DOCTORS
  useEffect(() => {
    async function loadDoctors() {
      const res = await fetch("/api/doctors/list");
      const data = await res.json();

      setDoctors(data);
    }

    loadDoctors();
  }, []);

  // LOAD SLOTS
  useEffect(() => {
    async function loadSlots() {
      if (!selectedDoctor) return;

      const res = await fetch(
        `/api/booking/slots?doctor_id=${selectedDoctor}&date=${formData.date}`
      );

      const data = await res.json();

      setSlots(data.slots || []);
    }

    loadSlots();
  }, [selectedDoctor, formData.date]);

  async function handleSubmit() {
    try {
      setLoading(true);

      const payload = {
        ...formData,
        preferredDoctorId:
          preferredDoctor ? selectedDoctor : null,
      };

      const res = await fetch("/api/patient/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      // EMERGENCY CASE
      if (data.emergency) {
        alert(data.message);
        return;
      }

      if (!res.ok) {
        alert(data.error || "Booking failed");
        return;
      }

      router.push(data.redirectUrl);
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* HEADER */}
      <header className="h-16 border-b bg-white dark:bg-zinc-950 px-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="font-bold">
          QueueSense
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-3xl mx-auto py-10 px-4">
        <div className="space-y-8">
          {/* TITLE */}
          <div>
            <h1 className="text-4xl font-black">
              Smart Appointment Booking
            </h1>

            <p className="text-zinc-500 mt-2">
              QueueSense intelligently assigns
              doctors and optimizes live queues.
            </p>
          </div>

          {/* PATIENT DETAILS */}
          <Card className="rounded-3xl">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <h2 className="font-bold text-xl">
                  Patient Information
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>

                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <Label>Age</Label>

                  <Input
                    type="number"
                    value={formData.age}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        age: e.target.value,
                      })
                    }
                    placeholder="Age"
                  />
                </div>

                <div>
                  <Label>Phone Number</Label>

                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone: e.target.value,
                      })
                    }
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>

                <div>
                  <Label>Preferred Date</Label>

                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* SYMPTOMS */}
              <div>
                <Label>Describe Symptoms</Label>

                <textarea
                  rows={5}
                  className="w-full border rounded-xl p-4 bg-transparent"
                  placeholder="Describe your symptoms in detail..."
                  value={formData.symptoms}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      symptoms: e.target.value,
                    })
                  }
                />
              </div>

              {/* EMERGENCY WARNING */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />

                <div className="text-sm text-amber-800">
                  If your symptoms indicate a
                  medical emergency, QueueSense
                  will recommend immediate
                  hospital visitation instead of
                  online booking.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PREFERRED DOCTOR */}
          <Card className="rounded-3xl">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-xl">
                    Preferred Doctor
                  </h2>

                  <p className="text-sm text-zinc-500">
                    Optional — QueueSense can
                    auto-assign the best doctor.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={preferredDoctor}
                  onChange={(e) =>
                    setPreferredDoctor(
                      e.target.checked
                    )
                  }
                  className="w-5 h-5"
                />
              </div>

              {preferredDoctor && (
                <div className="grid gap-4">
                  {doctors.map((doctor) => (
                    <div
                      key={doctor.id}
                      onClick={() =>
                        setSelectedDoctor(
                          doctor.id
                        )
                      }
                      className={`border rounded-2xl p-4 cursor-pointer transition ${selectedDoctor === doctor.id
                          ? "border-black bg-zinc-100"
                          : ""
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold">
                            Dr. {doctor.name}
                          </div>

                          <div className="text-sm text-zinc-500">
                            {
                              doctor.specialization
                            }
                          </div>
                        </div>

                        <Stethoscope className="w-5 h-5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SLOT SELECTION */}
          {preferredDoctor &&
            selectedDoctor && (
              <Card className="rounded-3xl">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />

                    <h2 className="font-bold text-xl">
                      Select Time Slot
                    </h2>
                  </div>

                  {slots.length === 0 ? (
                    <div className="text-zinc-500">
                      No available slots.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {slots.map((slot) => (
                        <button
                          key={slot.slot_id}
                          onClick={() =>
                            setFormData({
                              ...formData,
                              slotId:
                                slot.slot_id,
                            })
                          }
                          className={`border rounded-xl py-3 text-sm font-medium transition ${formData.slotId ===
                              slot.slot_id
                              ? "bg-black text-white"
                              : "hover:bg-zinc-100"
                            }`}
                        >
                          {slot.slot_time}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          {/* SUBMIT */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-14 text-lg rounded-2xl"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Confirm Appointment
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}