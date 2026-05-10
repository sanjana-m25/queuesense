"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Settings, History, Info, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

/**
 * Admin Settings Page
 * Configuration for hospital parameters and audit logs.
 */
export default function AdminSettingsPage() {
  const [hospital, setHospital] = useState<any>(null);
  const [interval, setIntervalValue] = useState<number>(60);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [offset, setOffset] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);

  const fetchLogs = async (currentOffset: number) => {
    try {
      const res = await fetch(`/api/admin/logs?limit=10&offset=${currentOffset}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      
      if (currentOffset === 0) {
        setLogs(data.logs);
      } else {
        setLogs(prev => [...prev, ...data.logs]);
      }
      setTotalLogs(data.total_count);
    } catch (err) {
      console.error('Logs fetch error:', err);
    }
  };

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      
      // Fetch Hospital
      const { data: hospitalData } = await supabase
        .from('hospitals')
        .select('*')
        .limit(1)
        .single();

      if (hospitalData) {
        setHospital(hospitalData);
        const settings = hospitalData.settings as { recalc_interval_seconds?: number } | null;
        setIntervalValue(settings?.recalc_interval_seconds || 60);
      }

      await fetchLogs(0);
      setIsLoading(false);
    }

    fetchData();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recalc_interval_seconds: interval }),
      });

      if (!response.ok) throw new Error('Failed to update settings');
      
      toast.success('Settings updated successfully');
      // Refresh logs to show the change
      await fetchLogs(0);
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const loadMoreLogs = () => {
    const nextOffset = offset + 10;
    setOffset(nextOffset);
    fetchLogs(nextOffset);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">System Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Configure global parameters and audit administrative actions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Queue Engine Configuration
              </CardTitle>
              <CardDescription>
                Define how often the dynamic queue should automatically recalculate positions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Recalculation Interval</Label>
                <div className="flex flex-wrap gap-4">
                  {[30, 45, 60].map((val) => (
                    <label 
                      key={val}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                        interval === val 
                        ? "bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50" 
                        : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800"
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="interval" 
                        className="hidden" 
                        checked={interval === val}
                        onChange={() => setIntervalValue(val)}
                      />
                      <span className="text-sm font-semibold">{val} Seconds</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 flex items-start gap-2 mt-2">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  Lower intervals provide more frequent updates but increase API load. 60s is recommended for most clinics.
                </p>
              </div>
            </CardContent>
            <CardFooter className="bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
              <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>

          {/* Recent Actions (Audit Log) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Actions
              </h2>
              <span className="text-xs text-zinc-500 font-medium">{totalLogs} total entries</span>
            </div>
            
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50">
                    <TableHead>Time</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target Patient</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-medium">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500 truncate max-w-[120px]">
                        {log.admin_user_id}
                      </TableCell>
                      <TableCell>
                        <code className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-bold">
                          {log.action}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.target_patient_name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {logs.length < totalLogs && (
                <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 text-center">
                  <Button variant="ghost" size="sm" onClick={loadMoreLogs}>
                    Load more actions
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hospital Info (Sidebar) */}
        <div className="space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-zinc-500">Hospital Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-zinc-400 text-[10px] uppercase font-bold">Hospital Name</Label>
                <p className="font-semibold">{hospital?.name}</p>
              </div>
              <div>
                <Label className="text-zinc-400 text-[10px] uppercase font-bold">Address</Label>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{hospital?.address}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-zinc-400 text-[10px] uppercase font-bold">Latitude</Label>
                  <div className="flex items-center gap-1.5 text-sm font-mono">
                    <MapPin className="w-3 h-3 text-zinc-400" />
                    {hospital?.lat}
                  </div>
                </div>
                <div className="flex-1">
                  <Label className="text-zinc-400 text-[10px] uppercase font-bold">Longitude</Label>
                  <div className="flex items-center gap-1.5 text-sm font-mono">
                    <MapPin className="w-3 h-3 text-zinc-400" />
                    {hospital?.lng}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
