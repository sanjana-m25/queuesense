"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';

/**
 * Header component for admin and doctor dashboards.
 * Includes logo, hospital info, and logout functionality.
 */
export default function Header() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const hospitalName = process.env.NEXT_PUBLIC_HOSPITAL_NAME || 'City General Hospital';

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('Failed to sign out');
        console.error('Sign out error:', error);
        return;
      }
      
      toast.success('Signed out successfully');
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
      toast.error('An unexpected error occurred');
    }
  };

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center">
              <span className="text-zinc-50 dark:text-zinc-900 font-bold text-xl">Q</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              QueueSense
            </span>
          </Link>
          
          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden md:block" />
          
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{hospitalName}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">{user.email}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-tight">{user.user_metadata?.role}</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
