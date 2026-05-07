"use client";

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface RecalcCountdownProps {
  lastRecalcAt: string | null;
  intervalSeconds: number;
}

/**
 * RecalcCountdown component to show when the next automated queue update will happen.
 */
export default function RecalcCountdown({ lastRecalcAt, intervalSeconds }: RecalcCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(intervalSeconds);

  useEffect(() => {
    if (!lastRecalcAt) {
      setTimeLeft(intervalSeconds);
      return;
    }

    const calculateTimeLeft = () => {
      const lastUpdate = new Date(lastRecalcAt).getTime();
      const now = new Date().getTime();
      const elapsedSeconds = Math.floor((now - lastUpdate) / 1000);
      const remaining = Math.max(0, intervalSeconds - elapsedSeconds);
      return remaining;
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Tick every second
    const intervalId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [lastRecalcAt, intervalSeconds]);

  return (
    <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
      <RefreshCw className={`w-4 h-4 ${timeLeft === 0 ? 'animate-spin' : ''}`} />
      <span>
        {timeLeft === 0 ? 'Updating...' : `Next update in ${timeLeft}s`}
      </span>
    </div>
  );
}
