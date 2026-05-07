"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { MapPin, ShieldCheck, Clock, User, Loader2 } from 'lucide-react';
import LocationTracker from './LocationTracker';
import { createClient } from '@/lib/supabase/client';

interface ConsentScreenProps {
  token: string;
  appointmentId: string;
}

/**
 * ConsentScreen component for patients to review details and opt-in to location tracking.
 */
export default function ConsentScreen({ token, appointmentId }: ConsentScreenProps) {
  const [hasConsented, setHasConsented] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function fetchDetails() {
      const supabase = createClient();
      // We query public-facing tables using the appointmentId which we know is valid via the token
      const { data: appt, error } = await supabase
        .from('appointments')
        .select(`
          scheduled_time,
          patients (name),
          doctors (name)
        `)
        .eq('id', appointmentId)
        .single();

      if (appt) {
        setData(appt);
      }
      setLoading(false);
    }

    fetchDetails();
  }, [appointmentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-300" />
        <p className="text-zinc-500">Retrieving appointment details...</p>
      </div>
    );
  }

  if (hasConsented) {
    return <LocationTracker token={token} appointmentId={appointmentId} patientName={data?.patients?.name} />;
  }

  return (
    <Card className="w-full max-w-md border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
      <div className="h-2 bg-zinc-900 dark:bg-zinc-50" />
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Share Location?</CardTitle>
        <CardDescription> help us optimize your wait time</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Appointment Summary */}
        <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-semibold">{data?.patients?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span className="text-sm">Appt with <strong>Dr. {data?.doctors?.name}</strong> at <strong>{data?.scheduled_time}</strong></span>
          </div>
        </div>

        {/* Benefits List */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="mt-1">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Priority Positioning</p>
              <p className="text-xs text-zinc-500">Patients with a known arrival time are prioritized in the live queue.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="mt-1">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Privacy First</p>
              <p className="text-xs text-zinc-500">Your location is only shared during this appointment window and is automatically deleted afterwards.</p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 p-6 border-t border-zinc-100 dark:border-zinc-800">
        <Button 
          className="w-full bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          size="lg"
          onClick={() => setHasConsented(true)}
        >
          Share My Location
        </Button>
        <p className="text-[10px] text-center text-zinc-400">
          By clicking, you agree to share your GPS coordinates with QueueSense for queue optimization.
        </p>
      </CardFooter>
    </Card>
  );
}
