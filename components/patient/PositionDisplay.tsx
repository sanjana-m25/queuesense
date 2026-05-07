"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Stethoscope, Loader2, CheckCircle2 } from 'lucide-react';

interface PositionDisplayProps {
  token: string;
}

/**
 * PositionDisplay component for patients to monitor their live queue position.
 */
export default function PositionDisplay({ token }: PositionDisplayProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/patient/status?token=${token}`);
      if (!res.ok) throw new Error('Failed to refresh status');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-300" />
        <p className="text-zinc-500">Checking your position...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="border-rose-200 bg-rose-50 p-6 text-center">
        <p className="text-rose-700">Unable to load your status. Please try again later.</p>
      </Card>
    );
  }

  const isArrived = data?.eta_status === 'arrived';

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Position Header */}
      <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
        <div className="bg-zinc-900 dark:bg-zinc-50 p-8 text-center text-zinc-50 dark:text-zinc-900">
          {isArrived ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <h2 className="text-3xl font-bold">You Have Arrived</h2>
            </div>
          ) : (
            <>
              <p className="text-xs uppercase font-bold tracking-widest opacity-60 mb-2">Current Position</p>
              <h2 className="text-6xl font-black">#{data?.position || '?'}</h2>
              <p className="text-sm mt-2 opacity-80">in the live queue</p>
            </>
          )}
        </div>
        
        <CardContent className="p-6 space-y-6">
          {isArrived ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl text-center">
              <p className="text-emerald-800 dark:text-emerald-400 font-semibold">
                Please check in at the reception desk to begin your consultation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Scheduled Time</span>
                <div className="flex items-center gap-2 font-semibold">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  {data?.scheduled_time}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Consulting Doctor</span>
                <div className="flex items-center gap-2 font-semibold">
                  <Stethoscope className="w-4 h-4 text-zinc-400" />
                  Dr. {data?.doctor_name}
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </div>
              <span>Next update in 30s</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {!isArrived && (
        <p className="text-center text-xs text-zinc-400 px-8">
          This position is dynamic and may change based on arrival times and medical urgency.
        </p>
      )}
    </div>
  );
}
