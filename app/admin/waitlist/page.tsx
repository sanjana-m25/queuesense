"use client";

import React, { useState, useEffect } from 'react';
import WaitlistPanel from '@/components/waitlist/WaitlistPanel';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ClipboardList, Stethoscope } from 'lucide-react';

/**
 * Admin Waitlist Page
 * Dashboard for managing patient waitlists.
 */
export default function AdminWaitlistPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function fetchDoctors() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('doctors')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (!error && data) {
        setDoctors(data);
        if (data.length > 0) {
          setSelectedDoctorId(data[0].id);
        }
      }
      setIsLoadingDoctors(false);
    }

    fetchDoctors();
  }, []);

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Patient Waitlist</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Manage replacements for no-shows or cancellations.</p>
        </div>

        <div className="flex items-center gap-3">
          <Stethoscope className="w-4 h-4 text-zinc-400" />
          <select 
            value={selectedDoctorId || ''} 
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            disabled={isLoadingDoctors}
            className="w-[240px] h-10 px-3 rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300"
          >
            {!selectedDoctorId && <option value="" disabled>Select a doctor</option>}
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoadingDoctors ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
        </div>
      ) : selectedDoctorId && selectedDoctor ? (
        <WaitlistPanel 
          doctorId={selectedDoctorId} 
          date={today} 
        />
      ) : (
        <div className="text-center py-20 text-zinc-500">
          No doctors found.
        </div>
      )}
    </div>
  );
}
