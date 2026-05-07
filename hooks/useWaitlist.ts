import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * useWaitlist Realtime Hook
 * 
 * Fetches the initial waitlist and listens for realtime updates to waitlist_entries.
 * 
 * @param doctorId UUID of the doctor
 * @param date YYYY-MM-DD date of the waitlist
 */
export function useWaitlist(doctorId: string | null, date: string | null) {
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchWaitlist = async () => {
    if (!doctorId || !date) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/waitlist?doctor_id=${doctorId}&date=${date}`);
      if (!res.ok) throw new Error('Failed to fetch waitlist');
      
      const data = await res.json();
      setWaitlist(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!doctorId || !date) return;

    fetchWaitlist();

    const channel = supabase
      .channel(`waitlist:${doctorId}:${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waitlist_entries',
          filter: `doctor_id=eq.${doctorId}`,
        },
        async (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          const recordDate = (newRecord as any)?.waitlist_date || (oldRecord as any)?.waitlist_date;
          if (recordDate && recordDate !== date) return;

          console.log('[Realtime] Waitlist change detected:', eventType, payload);

          if (eventType === 'INSERT' || eventType === 'DELETE') {
            fetchWaitlist();
          } else if (eventType === 'UPDATE') {
            setWaitlist(prev => {
              const updated = prev.map(item => {
                if (item.waitlist_entry_id === (newRecord as any).id) {
                  return {
                    ...item,
                    status: (newRecord as any).status,
                    urgency_level: (newRecord as any).urgency_level,
                    eta_seconds: (newRecord as any).eta_seconds
                  };
                }
                return item;
              });
              
              // Secondary sort logic often needed, but for simplicity we'll just keep the update
              return [...updated];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, date]);

  return { waitlist, loading, error, refetch: fetchWaitlist };
}
