"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface CancelBookingDialogProps {
  appointmentId: string;
  hospitalId: string;
}

export default function CancelBookingDialog({ appointmentId, hospitalId }: CancelBookingDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleCancel = async () => {
    if (!phone) {
      setErrorMsg("Please enter the phone number you used to book.");
      return;
    }

    setIsCancelling(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/booking/cancel', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appointmentId,
          patient_phone: phone
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel booking');
      }

      toast.success("Booking cancelled successfully.");
      setIsOpen(false);
      router.push(`/book?hospital_id=${hospitalId}`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={
        <Button variant="link" className="text-zinc-500 hover:text-red-500 px-0 h-auto">
          Cancel Booking
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Booking?</DialogTitle>
          <DialogDescription>
            To confirm cancellation, please enter the phone number you used to book this appointment.
            Note: Appointments can only be cancelled at least 2 hours in advance.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input 
                type="tel" 
                placeholder="+91..." 
                className="pl-9"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isCancelling}
              />
            </div>
            {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isCancelling}>
            Go Back
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={!phone || isCancelling}>
            {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
