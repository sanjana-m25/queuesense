import React from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * AdminLayout component for all /admin routes.
 * Provides a sticky header and sidebar navigation with E2E auth guards.
 */
export default async function AdminLayout({
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
  if (role === 'doctor') {
    redirect('/doctor');
  }

  if (role !== 'admin' && role !== 'receptionist') {
    redirect('/login');
  }
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
          <div className="container mx-auto p-6 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
