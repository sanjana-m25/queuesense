"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Stethoscope, User } from 'lucide-react';

/**
 * Admin Doctors Page
 * Lists all doctors and their current performance metrics.
 */
export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDoctors() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('name');

      if (!error && data) {
        setDoctors(data);
      }
      setIsLoading(false);
    }

    fetchDoctors();
  }, []);

  return (
    <div className="space-y-8">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Doctors Directory</h1>
        <p className="text-zinc-500 dark:text-zinc-400">View and manage hospital medical staff.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50">
                <TableHead className="w-[300px]">Name</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Avg. Consultation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doctor) => (
                <TableRow key={doctor.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                        <User className="h-4 w-4" />
                      </div>
                      {doctor.name}
                    </div>
                  </TableCell>
                  <TableCell>{doctor.specialty || 'General Practice'}</TableCell>
                  <TableCell>
                    <Badge variant={doctor.is_active ? 'default' : 'secondary'} className="text-[10px] uppercase font-bold">
                      {doctor.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-zinc-900 dark:text-zinc-50">
                    ~{Math.round(doctor.avg_consultation_minutes || 10)} min
                  </TableCell>
                </TableRow>
              ))}
              {doctors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-zinc-500">
                    No doctors found in the system.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
