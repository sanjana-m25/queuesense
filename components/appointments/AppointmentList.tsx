"use client";

import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import AppointmentActions from './AppointmentActions';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  patient_name: string;
  patient_phone: string;
  scheduled_time: string;
  doctor_name: string;
  booked_via: string;
  status: string;
  position: number | null;
}

interface AppointmentListProps {
  initialAppointments: Appointment[];
}

export default function AppointmentList({ initialAppointments }: AppointmentListProps) {
  const [filter, setFilter] = useState<'All' | 'Scheduled' | 'Completed' | 'Cancelled'>('All');

  const filteredAppointments = initialAppointments.filter(appt => {
    if (filter === 'All') return true;
    if (filter === 'Scheduled') return appt.status === 'scheduled';
    if (filter === 'Completed') return appt.status === 'completed';
    if (filter === 'Cancelled') return appt.status === 'cancelled';
    return true;
  });

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
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg w-fit">
        {(['All', 'Scheduled', 'Completed', 'Cancelled'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
              filter === t 
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50" 
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50">
              <TableHead className="w-[60px] text-center">Pos</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Booked Via</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAppointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-zinc-500">
                  No appointments found for this filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredAppointments.map((appt) => (
                <TableRow key={appt.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                  <TableCell className="text-center font-bold text-zinc-400">
                    {appt.position || '—'}
                  </TableCell>
                  <TableCell className="font-semibold">{appt.patient_name}</TableCell>
                  <TableCell className="text-zinc-500 text-xs font-mono">{appt.patient_phone}</TableCell>
                  <TableCell className="font-medium text-xs">{appt.scheduled_time.substring(0, 5)}</TableCell>
                  <TableCell className="text-sm">{appt.doctor_name}</TableCell>
                  <TableCell>
                    {appt.booked_via === 'patient' ? (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 text-[10px] px-1.5 py-0">
                        Self-booked
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-zinc-50 text-zinc-600 border-zinc-100 dark:bg-zinc-900/40 dark:text-zinc-400 dark:border-zinc-800 text-[10px] px-1.5 py-0">
                        Admin
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px] px-2 py-0 capitalize border-none", getStatusColor(appt.status))}>
                      {appt.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AppointmentActions 
                      appointmentId={appt.id} 
                      patientName={appt.patient_name} 
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
