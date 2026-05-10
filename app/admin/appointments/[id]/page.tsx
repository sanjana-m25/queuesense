import React from 'react';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Stethoscope, 
  Activity, 
  MapPin, 
  Clock3,
  BadgeInfo
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppointmentDetailActions from '@/components/appointments/AppointmentDetailActions';
import { cn } from '@/lib/utils';

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: appt, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients (
        id,
        name,
        phone,
        eta_status
      ),
      doctors (
        id,
        name,
        specialty
      ),
      queue_entries (
        position
      )
    `)
    .eq('id', id)
    .single();

  if (error || !appt) {
    notFound();
  }

  const patient = appt.patients as { id: string; name: string; phone: string; eta_status: string } | null;
  const doctor = appt.doctors as { id: string; name: string; specialty: string } | null;
  const queueEntry = (appt.queue_entries as { position: number }[] | null)?.[0];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'in_consultation': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'no_show': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'cancelled': return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-300';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link 
        href="/admin/appointments" 
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Appointments
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            Appointment Detail
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Ref: {appt.id.substring(0, 8).toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={cn("text-xs px-3 py-1 capitalize border-none", getStatusColor(appt.status))}>
            {appt.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 text-xs px-3 py-1 border-zinc-200 dark:border-zinc-800">
            {appt.booked_via === 'patient' ? 'Self-booked' : 'Admin Entry'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-8">
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden">
            <div className="h-2 bg-zinc-900 dark:bg-zinc-50" />
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">Full Name</p>
                <p className="text-lg font-bold">{patient?.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">Phone Number</p>
                <p className="text-lg font-mono flex items-center gap-2">
                  <Phone className="w-4 h-4 text-zinc-300" />
                  {patient?.phone}
                </p>
              </div>
            </CardContent>
            
            <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-zinc-400" />
                  Timeline
                </h4>
              </div>
              <div className="flex flex-wrap gap-8 text-[11px] font-medium text-zinc-500 uppercase tracking-tight">
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-400">Booked</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{appt.created_at ? new Date(appt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-400">Scheduled</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{appt.scheduled_time.substring(0, 5)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-400">Arrived</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{appt.arrived_at ? new Date(appt.arrived_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-400">Notified</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{appt.consent_notified_at ? new Date(appt.consent_notified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <AppointmentDetailActions 
            appointmentId={appt.id} 
            patientPhone={patient?.phone || ''} 
          />
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800 bg-indigo-50/30 dark:bg-indigo-900/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-indigo-500 font-black">Consultation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-indigo-100 dark:border-indigo-900 shrink-0">
                  <Stethoscope className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-bold">{doctor?.name}</p>
                  <p className="text-[10px] text-zinc-500 font-medium">{doctor?.specialty}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-indigo-100 dark:border-indigo-900 shrink-0">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-bold">{appt.scheduled_date}</p>
                  <p className="text-[10px] text-zinc-500 font-medium">{appt.scheduled_time.substring(0, 5)}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-indigo-100/50 dark:border-indigo-900/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">Queue Position</span>
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">#{queueEntry?.position || '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-zinc-400 font-bold">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs font-medium">ETA Status</span>
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase font-bold py-0">
                  {patient?.eta_status || 'Uncertain'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BadgeInfo className="w-3 h-3 text-zinc-400" />
                  <span className="text-xs font-medium">Booking Source</span>
                </div>
                <span className="text-xs font-bold capitalize">{appt.booked_via}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
