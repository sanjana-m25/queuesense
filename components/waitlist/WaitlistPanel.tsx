"use client";

import React, { useState } from 'react';
import { useWaitlist } from '@/hooks/useWaitlist';
import WaitlistRow from './WaitlistRow';
import { Loader2, ClipboardList, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface WaitlistPanelProps {
  doctorId: string;
  date: string;
}

/**
 * WaitlistPanel component for managing the patient waitlist.
 */
export default function WaitlistPanel({ doctorId, date }: WaitlistPanelProps) {
  const { waitlist, loading, error, refetch } = useWaitlist(doctorId, date);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [slotTime, setSlotTime] = useState('12:00');
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = async () => {
    if (!selectedEntry || !slotTime) return;

    setIsResolving(true);
    try {
      const response = await fetch('/api/waitlist/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waitlist_entry_id: selectedEntry.waitlist_entry_id,
          appointment_slot_time: slotTime
        }),
      });

      if (!response.ok) throw new Error('Failed to resolve waitlist entry');

      toast.success(`${selectedEntry.patient.name} has been added to the queue`);
      setSelectedEntry(null);
      refetch();
    } catch (err) {
      toast.error('Failed to fill slot from waitlist');
    } finally {
      setIsResolving(false);
    }
  };

  if (loading && waitlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-300" />
        <p className="mt-4 text-zinc-500">Loading waitlist...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {waitlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20">
          <ClipboardList className="w-12 h-12 text-zinc-300 mb-4" />
          <p className="text-zinc-500 font-medium">Waitlist is empty.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {waitlist.map((entry) => (
            <WaitlistRow 
              key={entry.waitlist_entry_id} 
              entry={entry} 
              onFillSlot={(e) => setSelectedEntry(e)} 
            />
          ))}
        </div>
      )}

      {/* Fill Slot Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Appointment Slot</DialogTitle>
            <DialogDescription>
              Assigning <strong>{selectedEntry?.patient?.name}</strong> to an available slot.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="slotTime">Slot Start Time</Label>
              <Input 
                id="slotTime" 
                type="time" 
                value={slotTime} 
                onChange={(e) => setSlotTime(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEntry(null)}>Cancel</Button>
            <Button onClick={handleResolve} disabled={isResolving}>
              {isResolving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm & Notify Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
