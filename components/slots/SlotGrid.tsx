"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Slot {
  id: string;
  slot_time: string;
  is_booked: boolean;
  patient_name?: string | null;
}

interface SlotGridProps {
  slots: Slot[];
  isLoading: boolean;
}

export default function SlotGrid({ slots, isLoading }: SlotGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-zinc-100 dark:border-zinc-900 rounded-xl">
        <p className="text-zinc-500">No slots generated for this date. Use the form above.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {slots.map((slot) => {
        // Format time (remove seconds)
        const displayTime = slot.slot_time.substring(0, 5);
        
        return (
          <div
            key={slot.id}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-semibold text-center transition-all border",
              slot.is_booked
                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
            )}
          >
            <div className="mb-0.5">{displayTime}</div>
            {slot.is_booked && (
              <div className="text-[9px] opacity-80 truncate">
                {slot.patient_name ? (slot.patient_name.length > 12 ? `${slot.patient_name.substring(0, 10)}..` : slot.patient_name) : 'Booked'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
