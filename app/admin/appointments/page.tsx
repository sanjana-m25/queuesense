import React from 'react';
import { createServerClient } from '@/lib/supabase/server';
import AppointmentList from '@/components/appointments/AppointmentList';
import { Calendar, Filter, User } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ doctor_id?: string; date?: string; status?: string }>;
}) {
  const params = await searchParams;
  const doctorId = params.doctor_id || "";
  const dateStr = params.date || new Date().toISOString().split('T')[0];
  const hospitalId = process.env.HOSPITAL_ID;

  const supabase = await createServerClient();

  // Fetch Doctors for the filter
  const { data: doctors } = await supabase
    .from('doctors')
    .select('id, name')
    .eq('hospital_id', hospitalId!)
    .eq('is_active', true);

  // Fetch Appointments
  let query = supabase
    .from('appointments')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      status,
      booked_via,
      patients (
        name,
        phone
      ),
      doctors (
        name
      ),
      queue_entries (
        position
      )
    `)
    .eq('hospital_id', hospitalId!)
    .eq('scheduled_date', dateStr);

  if (doctorId) {
    query = query.eq('doctor_id', doctorId);
  }

  const { data: rawAppointments, error } = await query.order('scheduled_time', { ascending: true });

  const appointments = (rawAppointments || []).map(appt => ({
    id: appt.id,
    patient_name: (appt.patients as { name: string } | null)?.name || 'Unknown',
    patient_phone: (appt.patients as { phone: string } | null)?.phone || '—',
    scheduled_time: appt.scheduled_time,
    doctor_name: (appt.doctors as { name: string } | null)?.name || 'Unknown',
    booked_via: appt.booked_via || 'admin',
    status: appt.status,
    position: (appt.queue_entries as { position: number }[] | null)?.[0]?.position || null
  }));

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Appointments</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Manage patient bookings and track consultation status.</p>
        </div>
      </div>

      {/* URL-linked Filters */}
      <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">Filter by Date</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <form action="/admin/appointments" method="GET">
              {doctorId && <input type="hidden" name="doctor_id" value={doctorId} />}
              <Input 
                name="date"
                type="date" 
                defaultValue={dateStr}
                className="pl-10 bg-white dark:bg-zinc-950"
                onChange={(e) => e.target.form?.submit()}
              />
            </form>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-zinc-400">Filter by Doctor</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 z-10 pointer-events-none" />
            <form action="/admin/appointments" method="GET" id="doctor-filter-form">
              <input type="hidden" name="date" value={dateStr} />
              <Select 
                name="doctor_id"
                defaultValue={doctorId}
                onValueChange={(val) => {
                  const form = document.getElementById('doctor-filter-form') as HTMLFormElement;
                  const input = form.querySelector('input[name="doctor_id"]') as HTMLInputElement || document.createElement('input');
                  input.name = "doctor_id";
                  input.value = val;
                  form.appendChild(input);
                  form.submit();
                }}
              >
                <SelectTrigger className="pl-10 bg-white dark:bg-zinc-950">
                  <SelectValue placeholder="All Doctors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Doctors</SelectItem>
                  {doctors?.map(doc => (
                    <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </form>
          </div>
        </div>
      </div>

      <AppointmentList initialAppointments={appointments} />
    </div>
  );
}
