"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Calendar, User, Phone, MapPin, AlertCircle, Stethoscope } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Step = 'selecting-doctor' | 'selecting-slot' | 'entering-details' | 'submitting';

function BookingFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hospitalId = searchParams.get('hospital_id');

  const [step, setStep] = useState<Step>('selecting-doctor');
  
  // Doctor Selection
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  // Slot Selection
  const dates = [new Date(), addDays(new Date(), 1), addDays(new Date(), 2)];
  const [selectedDate, setSelectedDate] = useState<Date>(dates[0]);
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  // Patient Details
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!hospitalId) return;
    
    const fetchDoctors = async () => {
      try {
        const res = await fetch(`/api/booking/doctors?hospital_id=${hospitalId}`);
        if (!res.ok) throw new Error('Failed to load doctors');
        const data = await res.json();
        setDoctors(data.doctors || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, [hospitalId]);

  useEffect(() => {
    if (step !== 'selecting-slot' || !selectedDoctor) return;

    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      try {
        const res = await fetch(`/api/booking/slots?doctor_id=${selectedDoctor.id}&date=${dateStr}`);
        if (!res.ok) throw new Error('Failed to load slots');
        const data = await res.json();
        setSlots(data.slots || []);
      } catch (err) {
        console.error(err);
        setSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [step, selectedDate, selectedDoctor]);

  if (!hospitalId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Invalid booking link. Please contact the hospital.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !fullName || !phone || !consent) return;

    setStep('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          patient_name: fullName,
          patient_phone: phone,
          hospital_id: hospitalId
        })
      });

      const data = await res.json();

      if (res.status === 409) {
        setErrorMsg("Sorry, this slot was just taken. Please pick another.");
        setStep('selecting-slot');
        // Refresh slots for the selected date
        setSelectedDate(new Date(selectedDate.getTime())); 
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to book appointment');
      }

      router.push(`/book/success?appointment_id=${data.appointment_id}&phone=${encodeURIComponent(phone)}&hospital_id=${hospitalId}`);
    } catch (err: any) {
      setErrorMsg(err.message);
      setStep('entering-details');
    }
  };

  const isFormValid = fullName.trim().length >= 2 && fullName.trim().length <= 100 && phone.trim().length >= 8 && consent;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Book Appointment</h1>
          <p className="mt-2 text-zinc-500">Fast, easy, and secure queue booking</p>
        </div>

        {/* Step 1: Selecting Doctor */}
        {(step === 'selecting-doctor' || step === 'selecting-slot' || step === 'entering-details' || step === 'submitting') && (
          <div className={`space-y-4 ${step !== 'selecting-doctor' ? 'opacity-50' : ''}`}>
            {step === 'selecting-doctor' ? (
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 text-white text-xs">1</span>
                Select a Doctor
              </h2>
            ) : (
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">{selectedDoctor?.name}</p>
                    <p className="text-xs text-zinc-500">{selectedDoctor?.specialty}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep('selecting-doctor')} disabled={step === 'submitting'}>
                  Change
                </Button>
              </div>
            )}

            {step === 'selecting-doctor' && (
              <div className="grid gap-4">
                {isLoadingDoctors ? (
                  Array(3).fill(0).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-200 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-zinc-200 rounded w-1/3" />
                          <div className="h-3 bg-zinc-200 rounded w-1/4" />
                        </div>
                        <div className="w-20 h-8 bg-zinc-200 rounded" />
                      </CardContent>
                    </Card>
                  ))
                ) : doctors.length === 0 ? (
                  <Alert>
                    <AlertDescription>No doctors available at this hospital currently.</AlertDescription>
                  </Alert>
                ) : (
                  doctors.map((doctor) => (
                    <Card key={doctor.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex w-12 h-12 rounded-full bg-indigo-50 items-center justify-center">
                            <Stethoscope className="w-6 h-6 text-indigo-500" />
                          </div>
                          <div>
                            <p className="font-bold text-lg text-zinc-900 dark:text-zinc-50">{doctor.name}</p>
                            <p className="text-sm text-zinc-500">{doctor.specialty || 'General'}</p>
                            <p className="text-xs text-emerald-600 font-medium mt-1 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                              ~{doctor.avg_consultation_minutes || 15} min per consultation
                            </p>
                          </div>
                        </div>
                        <Button onClick={() => {
                          setSelectedDoctor(doctor);
                          setStep('selecting-slot');
                        }}>
                          Select
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Selecting Slot */}
        {(step === 'selecting-slot' || step === 'entering-details' || step === 'submitting') && (
          <div className={`space-y-4 ${step !== 'selecting-slot' ? 'opacity-50' : ''}`}>
            {step === 'selecting-slot' ? (
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 text-white text-xs">2</span>
                Choose a Time
              </h2>
            ) : (
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">{selectedSlot?.slot_time?.substring(0, 5)}</p>
                    <p className="text-xs text-zinc-500">{format(selectedDate, 'EEEE, d MMMM yyyy')}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep('selecting-slot')} disabled={step === 'submitting'}>
                  Change
                </Button>
              </div>
            )}

            {step === 'selecting-slot' && (
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-6">
                  {/* Date Tabs */}
                  <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
                    {dates.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(d)}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                          format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                            ? 'bg-white shadow-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                            : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                      >
                        {format(d, 'EEE d')}
                      </button>
                    ))}
                  </div>

                  {errorMsg && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{errorMsg}</AlertDescription>
                    </Alert>
                  )}

                  {isLoadingSlots ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                      <p className="text-zinc-500">No slots available. Try another date.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {slots.map(slot => (
                        <button
                          key={slot.id}
                          onClick={() => {
                            setSelectedSlot(slot);
                            setStep('entering-details');
                            setErrorMsg('');
                          }}
                          className="py-2 text-xs font-bold rounded-md bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors"
                        >
                          {slot.slot_time.substring(0, 5)}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 3: Patient Details */}
        {(step === 'entering-details' || step === 'submitting') && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 text-white text-xs">3</span>
              Patient Details
            </h2>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <form onSubmit={handleBook} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="pl-9"
                        disabled={step === 'submitting'}
                        required
                        minLength={2}
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+919876543210"
                        className="pl-9"
                        disabled={step === 'submitting'}
                        required
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">+91 for India</p>
                  </div>

                  <div className="flex items-start space-x-3 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100">
                    <Checkbox 
                      id="consent" 
                      checked={consent}
                      onCheckedChange={(checked) => setConsent(checked as boolean)}
                      disabled={step === 'submitting'}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="consent"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        I agree my location may be shared for queue management
                      </Label>
                      <p className="text-xs text-zinc-500">
                        We use this to calculate your ETA and notify you when to arrive.
                      </p>
                    </div>
                  </div>

                  {errorMsg && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{errorMsg}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-bold" 
                    disabled={!isFormValid || step === 'submitting'}
                  >
                    {step === 'submitting' ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Booking...</>
                    ) : (
                      "Book Appointment"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>}>
      <BookingFlow />
    </Suspense>
  );
}
