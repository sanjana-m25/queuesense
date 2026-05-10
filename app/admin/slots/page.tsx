"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, X, Calendar, Clock, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import SlotGrid from '@/components/slots/SlotGrid';

export default function AdminSlotsPage() {
  const [doctors, setDoctors] = useState<{ id: string; name: string; specialty: string | null }[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
  );
  const [slots, setSlots] = useState<{ id: string; slot_time: string; is_booked: boolean; patient_name: string | null }[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [duration, setDuration] = useState("15");
  const [breakTimes, setBreakTimes] = useState<string[]>([]);

  const hospitalId = process.env.NEXT_PUBLIC_HOSPITAL_ID;

  const supabase = createClient();

  useEffect(() => {
    async function fetchDoctors() {
      if (!hospitalId) return;
      
      const { data, error } = await supabase
        .from('doctors')
        .select('id, name, specialty')
        .eq('hospital_id', hospitalId)
        .eq('is_active', true);

      if (error) {
        toast.error("Failed to fetch doctors");
      } else {
        setDoctors(data || []);
        if (data && data.length > 0) {
          setSelectedDoctorId(data[0].id);
        }
      }
      setIsLoadingDoctors(false);
    }

    fetchDoctors();
  }, [hospitalId, supabase]);

  const fetchSlots = async () => {
    if (!selectedDoctorId || !selectedDate) return;
    
    setIsLoadingSlots(true);
    try {
      // Fetch all slots (including booked ones) joined with appointments and patients
      const { data, error } = await supabase
        .from('available_slots')
        .select(`
          id,
          slot_time,
          is_booked,
          appointments (
            patients (
              name
            )
          )
        `)
        .eq('doctor_id', selectedDoctorId)
        .eq('slot_date', selectedDate)
        .order('slot_time', { ascending: true });

      if (error) throw error;
      
      const formattedSlots = (data || []).map(s => ({
        id: s.id,
        slot_time: s.slot_time,
        is_booked: s.is_booked,
        patient_name: (s.appointments as any)?.patients?.name || null
      }));
      
      setSlots(formattedSlots);
    } catch (err) {
      console.error("Error fetching slots:", err);
      toast.error("Failed to fetch slots");
    } finally {
      setIsLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [selectedDoctorId, selectedDate]);

  const handleAddBreak = () => setBreakTimes([...breakTimes, "13:00"]);
  const handleRemoveBreak = (index: number) => {
    const newBreaks = [...breakTimes];
    newBreaks.splice(index, 1);
    setBreakTimes(newBreaks);
  };
  const handleBreakChange = (index: number, value: string) => {
    const newBreaks = [...breakTimes];
    newBreaks[index] = value;
    setBreakTimes(newBreaks);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      toast.error("Please select a doctor");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/admin/slots/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: selectedDoctorId,
          date: selectedDate,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: parseInt(duration),
          break_times: breakTimes
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Generation failed");

      toast.success(`Generated ${result.generated} slots (${result.skipped} skipped)`);
      fetchSlots();
    } catch (err) {
      const error = err as Error;
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Manage Slots</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Generate and view consultation time slots for doctors.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Generate Slots
              </CardTitle>
              <CardDescription>
                Bulk generate availability for a specific doctor and date.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-6">
                <div className="space-y-2">
                  <Label>Select Doctor</Label>
                  <Select 
                    value={selectedDoctorId} 
                    onValueChange={setSelectedDoctorId}
                    disabled={isLoadingDoctors}
                  >
                    <SelectTrigger className="bg-white dark:bg-zinc-950">
                      <SelectValue placeholder="Choose a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <Input 
                      type="date" 
                      min={new Date().toISOString().split('T')[0]}
                      className="pl-10" 
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      <Input 
                        type="time" 
                        className="pl-10" 
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      <Input 
                        type="time" 
                        className="pl-10" 
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Duration (Minutes)</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="bg-white dark:bg-zinc-950">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 Minutes</SelectItem>
                      <SelectItem value="15">15 Minutes</SelectItem>
                      <SelectItem value="20">20 Minutes</SelectItem>
                      <SelectItem value="30">30 Minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Break Times</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] uppercase font-bold"
                      onClick={handleAddBreak}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Break
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {breakTimes.map((bt, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input 
                          type="time" 
                          value={bt} 
                          onChange={(e) => handleBreakChange(idx, e.target.value)}
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="shrink-0 text-zinc-400 hover:text-red-500"
                          onClick={() => handleRemoveBreak(idx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {breakTimes.length === 0 && (
                      <p className="text-[10px] text-zinc-400 italic">No breaks added</p>
                    )}
                  </div>
                </div>

                <Button className="w-full bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900" disabled={isGenerating}>
                  {isGenerating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    "Generate Slots"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* View Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-zinc-400" />
              Schedule for {selectedDate}
            </h2>
            {isLoadingSlots && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}
          </div>

          <SlotGrid slots={slots} isLoading={isLoadingSlots} />
        </div>
      </div>
    </div>
  );
}
