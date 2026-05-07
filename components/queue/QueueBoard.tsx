"use client";

import React, { useState, useEffect } from 'react';
import { useQueue } from '@/hooks/useQueue';
import PatientCard from './PatientCard';
import RecalcCountdown from './RecalcCountdown';
import { Loader2, AlertCircle, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

interface QueueBoardProps {
  doctorId: string;
  doctorName: string;
  date: string;
}

/**
 * SortableItem wrapper for PatientCard
 */
function SortablePatientCard({ entry, onLockToggle, onMarkArrived, onMarkNoShow }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: entry.appointment_id,
    disabled: entry.is_locked || entry.appointment_status !== 'scheduled'
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <PatientCard 
        entry={entry} 
        onLockToggle={onLockToggle}
        onMarkArrived={onMarkArrived}
        onMarkNoShow={onMarkNoShow}
      />
    </div>
  );
}

/**
 * QueueBoard component displaying live queue with drag-and-drop reordering.
 */
export default function QueueBoard({ doctorId, doctorName, date }: QueueBoardProps) {
  const { queue, loading, error, lastUpdatedAt, refetch } = useQueue(doctorId, date);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (queue) {
      setItems(queue);
    }
  }, [queue]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Avoid accidental drags when clicking buttons
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.appointment_id === active.id);
      const newIndex = items.findIndex(item => item.appointment_id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      const movedItem = items[oldIndex];
      const newPosition = newIndex + 1;

      // Optimistic update
      const previousItems = [...items];
      setItems(newItems.map((item, idx) => ({ ...item, position: idx + 1 })));

      try {
        const response = await fetch('/api/queue/override', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointment_id: movedItem.appointment_id,
            new_position: newPosition,
            lock: true
          }),
        });

        if (!response.ok) throw new Error('Failed to update position');
        
        toast.success(`Moved ${movedItem.patient.name} to position ${newPosition}`);
        // Realtime will handle the final state sync
      } catch (err) {
        toast.error('Failed to update queue position');
        setItems(previousItems);
      }
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="h-10 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-6 w-32 bg-zinc-100 dark:bg-zinc-900 rounded animate-pulse" />
        </div>
        <div className="grid gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 w-full bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 rounded-xl flex items-center gap-4 px-4">
              <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="h-3 w-1/4 bg-zinc-50 dark:bg-zinc-900 rounded animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-8 rounded bg-zinc-50 dark:bg-zinc-900 animate-pulse" />
                <div className="h-8 w-8 rounded bg-zinc-50 dark:bg-zinc-900 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {doctorName}'s Queue
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <RecalcCountdown lastRecalcAt={lastUpdatedAt} intervalSeconds={60} />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20">
          <Users className="w-12 h-12 text-zinc-300 mb-4" />
          <p className="text-zinc-500 font-medium">No patients in queue for this date.</p>
        </div>
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={items.map(i => i.appointment_id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-3">
              {items.map((entry) => (
                <SortablePatientCard 
                  key={entry.appointment_id} 
                  entry={entry} 
                  onLockToggle={() => refetch()} // Refresh state after manual actions
                  onMarkArrived={() => refetch()}
                  onMarkNoShow={() => refetch()}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
