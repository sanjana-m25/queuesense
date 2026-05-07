"use client";

import React from 'react';
import { useQueue } from '@/hooks/useQueue';
import ETABadge from '@/components/queue/ETABadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Loader2, User, Clock } from 'lucide-react';

interface DoctorQueueViewProps {
  doctorId: string;
  doctorName: string;
  date: string;
}

/**
 * DoctorQueueView component for doctors to see their upcoming patients.
 * Read-only view limited to the next 5 patients.
 */
export default function DoctorQueueView({ doctorId, doctorName, date }: DoctorQueueViewProps) {
  const { queue, loading, error } = useQueue(doctorId, date);

  // Filter for next 5 patients (excluding those already in consultation if needed, 
  // but prompt says "next 5 patients only")
  const upcomingPatients = queue.slice(0, 5);

  if (loading && queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-300" />
        <p className="mt-4 text-zinc-500">Syncing with live queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Dr. {doctorName} — Live Queue
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {error ? (
        <Card className="border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-900/10">
          <CardContent className="p-4 text-rose-700 dark:text-rose-400 text-sm">
            Failed to connect to live updates. Please refresh.
          </CardContent>
        </Card>
      ) : upcomingPatients.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
          <p className="text-zinc-500">No upcoming patients for today.</p>
        </div>
      ) : (
        <Card className="border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-lg">
          <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-500" />
              Next 5 Patients
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">Pos</TableHead>
                <TableHead>Patient Name</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="text-right">Status / ETA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingPatients.map((entry) => (
                <TableRow key={entry.appointment_id} className="h-16">
                  <TableCell className="font-bold text-lg text-zinc-400">
                    {entry.position}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {entry.patient.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-500 dark:text-zinc-400">
                    {entry.scheduled_time}
                  </TableCell>
                  <TableCell className="text-right">
                    <ETABadge status={entry.eta_status} etaMinutes={entry.eta_minutes} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
