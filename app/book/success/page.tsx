import React from 'react';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, Clock, User, Hash, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CancelBookingDialog from '@/components/book/CancelBookingDialog';

export default async function BookSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ appointment_id?: string; phone?: string; hospital_id?: string }>;
}) {
  const params = await searchParams;
  const appointmentId = params.appointment_id;
  const hospitalId = params.hospital_id;

  if (!appointmentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>Booking ID is missing. Please check your link.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const supabase = await createServerClient();

  const { data: appointment, error } = await supabase
    .from('appointments')
    .select(`
      scheduled_date,
      scheduled_time,
      doctors (name),
      queue_entries (position)
    `)
    .eq('id', appointmentId)
    .single();

  if (error || !appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>Booking not found. It may have been cancelled or the ID is invalid.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const doctorName = (appointment.doctors as { name: string } | null)?.name || 'Doctor';
  const queuePosition = (appointment.queue_entries as { position: number }[] | null)?.[0]?.position;

  // Format date correctly (assuming 'YYYY-MM-DD')
  const dateObj = new Date(appointment.scheduled_date);
  const formattedDate = dateObj.toLocaleDateString('en-GB', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  const formattedTime = appointment.scheduled_time.substring(0, 5); // Assuming HH:mm:ss

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        
        <Card className="border-emerald-100 shadow-xl shadow-emerald-900/5">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto mb-4 flex items-center justify-center w-20 h-20 bg-emerald-50 rounded-full">
              <CheckCircle2 size={64} className="text-emerald-500" />
            </div>
            <CardTitle className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
              Appointment Confirmed!
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Your consultation has been successfully scheduled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-5 space-y-4 border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-zinc-500">Doctor</p>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">{doctorName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-zinc-500">Date</p>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">{formattedDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-zinc-500">Time</p>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">{formattedTime}</p>
                </div>
              </div>
              {queuePosition && (
                <div className="flex items-center gap-3">
                  <Hash className="w-5 h-5 text-zinc-400" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-zinc-500">Queue Position</p>
                    <p className="font-bold text-indigo-600 dark:text-indigo-400">#{queuePosition}</p>
                  </div>
                </div>
              )}
            </div>

            <Alert className="bg-blue-50/50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs leading-relaxed ml-1">
                You'll receive an SMS 35 minutes before your appointment with a link to share your location and track your queue position.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 pt-2">
              <Link href={`/book${hospitalId ? `?hospital_id=${hospitalId}` : ''}`} className="w-full block">
                <Button className="w-full h-12 font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                  Book Another
                </Button>
              </Link>
              
              <div className="text-center">
                <CancelBookingDialog appointmentId={appointmentId} hospitalId={hospitalId || ''} />
              </div>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
