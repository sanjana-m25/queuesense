"use client";

import React, { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import DoctorQueueView from '@/components/doctor/DoctorQueueView';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Doctor Dashboard Page
 * Main entry point for medical staff to view their live queue.
 */
export default function DoctorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function fetchDoctorInfo() {
      if (authLoading || !user) return;

      const supabase = createClient();
      try {
        const { data, error: fetchError } = await supabase
          .from('doctors')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (fetchError) throw fetchError;
        setDoctor(data);
      } catch (err: any) {
        console.error('Error fetching doctor info:', err);
        setError('Could not verify doctor profile. Please contact an administrator.');
      } finally {
        setLoading(false);
      }
    }

    fetchDoctorInfo();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-300" />
        <p className="text-zinc-500 font-medium">Authenticating doctor profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header />
      <main className="container mx-auto p-6 max-w-5xl animate-in fade-in duration-700">
        {error ? (
          <Alert variant="destructive" className="mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Account Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : doctor ? (
          <DoctorQueueView 
            doctorId={doctor.id} 
            doctorName={doctor.name} 
            date={today} 
          />
        ) : (
          <div className="text-center py-20 text-zinc-500">
            No doctor profile linked to this account.
          </div>
        )}
      </main>
    </div>
  );
}
