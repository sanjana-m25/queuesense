import React from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * DoctorLayout component for all /doctor routes.
 * Provides E2E auth guards for medical staff.
 */
export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const role = user.user_metadata?.role;
  if (role === 'admin' || role === 'receptionist') {
    redirect('/admin/queue');
  }

  if (role !== 'doctor') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {children}
    </div>
  );
}
