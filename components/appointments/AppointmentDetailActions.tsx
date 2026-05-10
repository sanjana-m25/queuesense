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
import { Loader2, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface AppointmentDetailActionsProps {
  appointmentId: string;
  patientPhone: string;
}

export default function AppointmentDetailActions({ appointmentId, patientPhone }: AppointmentDetailActionsProps) {
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  const handleResendSms = async () => {
    setIsSendingSms(true);
    try {
      const res = await fetch('/api/consent/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: appointmentId }),
      });

      if (!res.ok) throw new Error("Failed to resend SMS");

      toast.success("SMS sent successfully");
    } catch (err) {
      const error = err as Error;
      toast.error(error.message);
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch('/api/booking/cancel', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: appointmentId, patient_phone: patientPhone }),
      });

      if (!res.ok) throw new Error("Failed to cancel appointment");

      toast.success("Appointment cancelled");
      router.push('/admin/appointments');
      router.refresh();
    } catch (err) {
      const error = err as Error;
      toast.error(error.message);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="flex gap-4">
      <Button 
        variant="outline" 
        className="flex-1"
        onClick={handleResendSms}
        disabled={isSendingSms}
      >
        {isSendingSms ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Resend SMS
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger render={
          <Button variant="destructive" className="flex-1">
            <Trash2 className="mr-2 h-4 w-4" />
            Cancel Appointment
          </Button>
        } />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment?</DialogTitle>
            <DialogDescription>
              This will permanently cancel the appointment and notify the patient. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Keep Appointment</Button>
            <Button 
              variant="destructive" 
              onClick={handleCancel} 
              disabled={isCancelling}
            >
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
