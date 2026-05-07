import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WaitlistRowProps {
  entry: any;
  onFillSlot: (entry: any) => void;
}

/**
 * WaitlistRow component for displaying a single waitlist entry.
 */
export default function WaitlistRow({ entry, onFillSlot }: WaitlistRowProps) {
  const urgencyColors: Record<string, string> = {
    high: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
    medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    low: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  };

  const etaMinutes = entry.eta_seconds ? Math.floor(entry.eta_seconds / 60) : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
          <User className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">{entry.patient.name}</h4>
            <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", urgencyColors[entry.urgency_level])}>
              {entry.urgency_level}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {etaMinutes !== null ? `~${etaMinutes} min away` : 'ETA Unknown'}
            </span>
            <span>•</span>
            <span>{entry.patient.phone}</span>
          </div>
        </div>
      </div>

      <Button size="sm" onClick={() => onFillSlot(entry)} className="w-full sm:w-auto">
        Fill Slot
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
