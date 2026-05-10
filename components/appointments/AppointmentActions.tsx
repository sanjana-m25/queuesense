"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Loader2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface AppointmentActionsProps {
  appointmentId: string;
  patientName: string;
}

export default function AppointmentActions({ appointmentId, patientName }: AppointmentActionsProps) {
  const [isArriving, setIsArriving] = useState(false);
  const [isNoShowing, setIsNoShowing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  const handleMarkArrived = async () => {
    setIsArriving(true);
    try {
      const res = await fetch('/api/patients/arrived', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: appointmentId }),
      });

      if (!res.ok) throw new Error("Failed to mark as arrived");

      toast.success(`${patientName} marked as arrived`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsArriving(false);
    }
  };

  const handleMarkNoShow = async () => {
    setIsNoShowing(true);
    try {
      const res = await fetch('/api/patients/no-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: appointmentId }),
      });

      if (!res.ok) throw new Error("Failed to mark as no-show");

      toast.success(`${patientName} marked as no-show`);
      setIsDialogOpen(false);
      router.refresh();
    } catch (err) {
      const error = err as Error;
      toast.error(error.message);
    } finally {
      setIsNoShowing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
        title="Mark Arrived"
        onClick={handleMarkArrived}
        disabled={isArriving}
      >
        {isArriving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger render={
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Mark No-Show"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        } />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as No-Show?</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark <strong>{patientName}</strong> as a no-show? This will remove them from the active queue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleMarkNoShow} 
              disabled={isNoShowing}
            >
              {isNoShowing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm No-Show
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Link href={`/admin/appointments/${appointmentId}`}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
