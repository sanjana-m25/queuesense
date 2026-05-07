"use client";

import React, { useState } from 'react';
import { QueueEntry } from '@/types/app';
import ETABadge from './ETABadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Lock, 
  Unlock, 
  User, 
  Clock, 
  MoreVertical, 
  AlertCircle, 
  CheckCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PatientCardProps {
  entry: QueueEntry;
  onLockToggle?: (entryId: string, locked: boolean) => void;
  onMarkArrived?: (appointmentId: string) => void;
  onMarkNoShow?: (appointmentId: string) => void;
}

/**
 * PatientCard component to display a single patient in the queue.
 */
export default function PatientCard({ 
  entry, 
  onLockToggle, 
  onMarkArrived, 
  onMarkNoShow 
}: PatientCardProps) {
  const [isLocking, setIsLocking] = useState(false);
  const [isArriving, setIsArriving] = useState(false);
  const [isNoShowing, setIsNoShowing] = useState(false);
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);
  
  // Optimistic UI state
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(false);

  const handleLockToggle = async () => {
    setIsLocking(true);
    try {
      const response = await fetch('/api/queue/lock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          queue_entry_id: entry.queue_entry_id, 
          locked: !entry.is_locked 
        }),
      });

      if (!response.ok) throw new Error('Failed to toggle lock');
      
      toast.success(entry.is_locked ? 'Entry unlocked' : 'Entry locked');
      onLockToggle?.(entry.queue_entry_id, !entry.is_locked);
    } catch (err) {
      toast.error('Failed to update lock status');
    } finally {
      setIsLocking(false);
    }
  };

  const handleMarkArrived = async () => {
    setIsArriving(true);
    const originalStatus = entry.eta_status;
    setOptimisticStatus('arrived'); // Optimistic update

    try {
      const response = await fetch('/api/patients/arrived', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: entry.appointment_id }),
      });

      if (!response.ok) throw new Error('Failed to mark arrived');
      
      toast.success('Patient marked as arrived');
      onMarkArrived?.(entry.appointment_id);
    } catch (err) {
      toast.error('Failed to update arrival status');
      setOptimisticStatus(originalStatus); // Revert on failure
    } finally {
      setIsArriving(false);
    }
  };

  const handleConfirmNoShow = async () => {
    setShowNoShowDialog(false);
    setIsNoShowing(true);
    setIsHidden(true); // Optimistic removal

    try {
      const response = await fetch('/api/patients/no-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: entry.appointment_id }),
      });

      if (!response.ok) throw new Error('Failed to mark no-show');
      
      toast.success('Patient marked as no-show');
      onMarkNoShow?.(entry.appointment_id);
    } catch (err) {
      toast.error('Failed to update no-show status');
      setIsHidden(false); // Revert on failure
    } finally {
      setIsNoShowing(false);
    }
  };

  if (isHidden) return null;

  return (
    <>
      <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center gap-4">
          {/* Position Number */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-lg text-zinc-900 dark:text-zinc-50">
            {entry.position}
          </div>

          {/* Patient Details */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                {entry.patient.name}
              </h3>
              <ETABadge 
                status={(optimisticStatus || entry.eta_status) as any} 
                etaMinutes={entry.eta_minutes} 
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {entry.scheduled_time}
              </span>
              <span className="flex items-center gap-1 truncate">
                <User className="w-3 h-3" />
                {entry.patient.phone}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLockToggle}
              disabled={isLocking || entry.appointment_status !== 'scheduled'}
              title={entry.is_locked ? "Unlock Position" : "Lock Position"}
            >
              {isLocking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : entry.is_locked ? (
                <Lock className="w-4 h-4 text-amber-500 fill-amber-500" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
            </Button>

            {entry.eta_status !== 'arrived' && entry.appointment_status === 'scheduled' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMarkArrived}
                  disabled={isArriving}
                  title="Mark Arrived"
                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  {isArriving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNoShowDialog(true)}
                  disabled={isNoShowing}
                  title="Mark No Show"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                >
                  {isNoShowing ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No Show Confirmation Dialog */}
      <Dialog open={showNoShowDialog} onOpenChange={setShowNoShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as No Show?</DialogTitle>
            <DialogDescription>
              This will remove <strong>{entry.patient.name}</strong> from today's queue. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoShowDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmNoShow}>Confirm No Show</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
