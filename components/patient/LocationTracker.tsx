"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, AlertCircle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface LocationTrackerProps {
  token: string;
  appointmentId: string;
  patientName: string;
}

/**
 * LocationTracker component that watches GPS and sends periodic updates to the server.
 */
export default function LocationTracker({ token, appointmentId, patientName }: LocationTrackerProps) {
  const [status, setStatus] = useState<'starting' | 'sharing' | 'denied' | 'error'>('starting');
  const [eta, setEta] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastCallTimeRef = useRef<number>(0);

  const THROTTLE_MS = 90 * 1000; // 90 seconds

  useEffect(() => {
    async function init() {
      // 1. Accept Consent on server
      try {
        await fetch(`/api/consent/accept?token=${token}`, { method: 'POST' });
      } catch (err) {
        console.error('Failed to register consent:', err);
      }

      // 2. Start Geolocation
      if (!("geolocation" in navigator)) {
        setStatus('error');
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const now = Date.now();
          // Throttle updates
          if (now - lastCallTimeRef.current < THROTTLE_MS) return;

          lastCallTimeRef.current = now;
          setLastUpdate(new Date());

          try {
            const res = await fetch(`/api/location/update?token=${token}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
              })
            });

            if (res.ok) {
              const data = await res.json();
              setEta(data.eta_minutes);
              setStatus('sharing');
            }
          } catch (err) {
            console.error('Update location error:', err);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          if (error.code === error.PERMISSION_DENIED) {
            setStatus('denied');
          } else {
            setStatus('error');
          }
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
      );
    }

    init();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [token]);

  return (
    <Card className="w-full max-w-md border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          {status === 'sharing' ? (
            <Navigation className="w-6 h-6 text-emerald-600 animate-pulse" />
          ) : status === 'denied' ? (
            <AlertCircle className="w-6 h-6 text-rose-600" />
          ) : (
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
          )}
        </div>
        <CardTitle className="text-xl">
          {status === 'sharing' ? 'Sharing Location' : status === 'denied' ? 'Access Denied' : 'Starting Tracker...'}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 text-center">
        {status === 'sharing' ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Tracker Active</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                {eta !== null ? `ETA ~${eta} min` : 'Calculating ETA...'}
              </p>
            </div>
            <p className="text-xs text-zinc-500">
              We are now monitoring your progress to optimize your spot in the queue. 
              {lastUpdate && ` Last update: ${lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        ) : status === 'denied' ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Location access was denied. Don't worry — your original queue position is held, 
              but we won't be able to provide an optimized ETA.
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 italic">Please allow location access when prompted by your browser.</p>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 p-6 border-t border-zinc-100 dark:border-zinc-800">
        <Link href={`/patient/status?token=${token}`} className="w-full">
          <Button variant="outline" className="w-full" size="lg">
            View My Queue Position
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
        <p className="text-[10px] text-center text-zinc-400">
          You can close this window at any time, but keeping it open ensures the most accurate timing.
        </p>
      </CardFooter>
    </Card>
  );
}
