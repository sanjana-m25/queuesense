import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { QueueEntry } from '@/types/app';

/**
 * useQueue Realtime Hook
 * 
 * Fetches the initial queue and listens for realtime updates to queue_entries.
 * 
 * @param doctorId UUID of the doctor
 * @param date YYYY-MM-DD date of the queue
 */
export function useQueue(doctorId: string | null, date: string | null) {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const supabase = createClient();

  const fetchQueue = async () => {
    if (!doctorId || !date) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/queue?doctor_id=${doctorId}&date=${date}`);
      if (!res.ok) throw new Error('Failed to fetch queue');
      
      const data = await res.json();
      setQueue(data.queue || []);
      setLastUpdatedAt(data.last_recalculated_at);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!doctorId || !date) return;

    fetchQueue();

    // Subscribe to Realtime changes for this doctor and date
    // Note: We use a filter to only get events for the specific doctor and date
    const channel = supabase
      .channel(`queue:${doctorId}:${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
          filter: `doctor_id=eq.${doctorId}`, // Date filtering in realtime is limited, so we check locally too
        },
        async (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          // Verify date matches (since we can't easily filter by date in the realtime subscription filter string for some types)
          const recordDate = (newRecord as any)?.queue_date || (oldRecord as any)?.queue_date;
          if (recordDate && recordDate !== date) return;

          console.log('[Realtime] Queue change detected:', eventType, payload);

          if (eventType === 'INSERT' || eventType === 'DELETE') {
            // For inserts/deletes, a full refetch is often safer to get all joined data (patients, etc.)
            // but the prompt asks to update without full refetch if possible.
            // However, since we don't have joined data in the payload, we must refetch.
            fetchQueue();
          } else if (eventType === 'UPDATE') {
            // If it's an update, we can update the local state for fields like position or is_locked
            setQueue(prevQueue => {
              const updatedQueue = prevQueue.map(item => {
                if (item.queue_entry_id === (newRecord as any).id) {
                  return {
                    ...item,
                    position: (newRecord as any).position,
                    is_locked: (newRecord as any).is_locked,
                    last_recalc_at: (newRecord as any).last_recalc_at
                  };
                }
                return item;
              });
              // Re-sort locally by position
              return updatedQueue.sort((a, b) => a.position - b.position);
            });
            setLastUpdatedAt((newRecord as any).last_recalc_at);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, date]);

  return { queue, loading, error, lastUpdatedAt, refetch: fetchQueue };
}
