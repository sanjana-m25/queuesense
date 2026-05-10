"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  ArrowLeft,
  Loader2,
  Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatPhoneNumber } from "@/lib/utils";

/**
 * Patient Portal Landing Page
 * Allows patients to find their live queue status using their phone number.
 */
export default function PatientPortal() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/patient/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formatPhoneNumber(phone) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to find appointment");
      }

      toast.success("Appointment found! Redirecting...");
      router.push(data.redirectUrl);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Mini Header */}
      <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center">
            <span className="text-zinc-50 dark:text-zinc-900 font-bold text-xs">Q</span>
          </div>
          <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-50 text-sm">
            QueueSense
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-12">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Patient Portal</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Enter your registered phone number to track your live queue position.</p>
          </div>

          <Card className="border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-zinc-200/50 dark:shadow-none">
            <form onSubmit={handleSearch}>
              <CardHeader>
                <CardTitle className="text-lg">Track My Appointment</CardTitle>
                <CardDescription>We'll look up your status for today.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input 
                      id="phone"
                      type="tel" 
                      placeholder="+91 98765 43210" 
                      className="pl-10"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Example: +919876543210</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 h-12 rounded-lg text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Find My Status
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* How it works */}
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-8">
          <Step 
            icon={<Smartphone className="w-5 h-5" />}
            title="1. Receive Link"
            description="You'll get an SMS 30-45 minutes before your slot."
          />
          <Step 
            icon={<MapPin className="w-5 h-5" />}
            title="2. Share Progress"
            description="Allow location sharing to help us optimize your position."
          />
          <Step 
            icon={<Clock className="w-5 h-5" />}
            title="3. Arrive Relaxed"
            description="Track your live # in the queue and see exactly when to arrive."
          />
        </div>
      </main>

      <footer className="py-8 text-center text-zinc-400 text-xs">
        &copy; {new Date().getFullYear()} QueueSense Healthcare Systems.
      </footer>
    </div>
  );
}

function Step({ icon, title, description }: any) {
  return (
    <div className="text-center space-y-3">
      <div className="mx-auto w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-50 shadow-sm">
        {icon}
      </div>
      <h4 className="font-bold text-zinc-900 dark:text-zinc-50">{title}</h4>
      <p className="text-sm text-zinc-500">{description}</p>
    </div>
  );
}
