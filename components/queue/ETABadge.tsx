import React from 'react';
import { Badge } from '@/components/ui/badge';
import { PatientEtaStatus } from '@/types/app';
import { cn } from '@/lib/utils';

interface ETABadgeProps {
  status: PatientEtaStatus;
  etaMinutes?: number | null;
  className?: string;
}

/**
 * ETABadge component to display patient status and ETA with color coding.
 */
export default function ETABadge({ status, etaMinutes, className }: ETABadgeProps) {
  let label = '';
  let variantClass = '';

  switch (status) {
    case 'known':
      if (etaMinutes !== undefined && etaMinutes !== null) {
        label = `~${etaMinutes} min`;
        variantClass = etaMinutes < 10 
          ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" 
          : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
      } else {
        label = 'Calculating...';
        variantClass = "bg-zinc-100 text-zinc-600 border-zinc-200";
      }
      break;
    case 'arrived':
      label = 'Arrived';
      variantClass = "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
      break;
    case 'no_show':
      label = 'No Show';
      variantClass = "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800";
      break;
    case 'uncertain':
    default:
      label = 'Unknown';
      variantClass = "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
      break;
  }

  return (
    <Badge 
      className={cn("px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider border", variantClass, className)}
      variant="outline"
    >
      {label}
    </Badge>
  );
}
