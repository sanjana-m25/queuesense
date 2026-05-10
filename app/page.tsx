"use client";

import React from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Clock, 
  Users, 
  Stethoscope, 
  ShieldCheck, 
  MapPin, 
  Zap,
  ChevronRight,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * QueueSense Homepage
 * High-fidelity landing page for patients and staff.
 */
export default function Home() {
  const hospitalName = process.env.NEXT_PUBLIC_HOSPITAL_NAME || "City General Hospital";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#000_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <Badge variant="outline" className="px-4 py-1 rounded-full border-zinc-200 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-medium animate-in fade-in slide-in-from-bottom-2 duration-700">
              <Zap className="w-3 h-3 mr-2 text-amber-500 fill-amber-500" />
              Revolutionizing OPD Flow
            </Badge>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.1] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Next-Gen OPD <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-500 to-zinc-900 dark:from-zinc-50 dark:via-zinc-400 dark:to-zinc-50">Queue Management</span>
            </h1>

            <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
              Real-time adaptive scheduling that flows with your patients. 
              Automatically optimize clinic efficiency using live GPS arrival predictions.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Button asChild size="lg" className="rounded-full px-8 h-12 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-xl shadow-zinc-200/50 dark:shadow-none transition-all hover:scale-105 active:scale-95">
                <Link href="/patient/book" className="flex items-center">
                  Book Appointment
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8 h-12 border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900 transition-all hover:scale-105 active:scale-95">
                <Link href="/patient">
                  Check My Position
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Insights Section */}
      <section className="py-12 bg-white dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-800/50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              icon={<Users className="w-5 h-5" />} 
              label="Patients Today" 
              value="142" 
              description="Total appointments" 
            />
            <StatCard 
              icon={<Clock className="w-5 h-5" />} 
              label="Avg. Wait Time" 
              value="14 min" 
              description="Real-time estimate" 
              trend="-4 min today"
            />
            <StatCard 
              icon={<Stethoscope className="w-5 h-5" />} 
              label="Active Doctors" 
              value="8" 
              description="Currently consulting" 
            />
            <StatCard 
              icon={<Activity className="w-5 h-5" />} 
              label="Queue Updates" 
              value="Live" 
              description="Syncing every 45s" 
              isLive
            />
          </div>
        </div>
      </section>

      {/* Role-Based Entry Points */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Built for modern healthcare.</h2>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  QueueSense replaces static slots with a dynamic flow. We use patient-consented location data to ensure doctors never have idle time and patients never wait longer than necessary.
                </p>
              </div>

              <div className="grid gap-6">
                <FeatureItem 
                  icon={<MapPin className="w-5 h-5 text-zinc-900 dark:text-zinc-50" />}
                  title="GPS-Adaptive Ordering"
                  description="Queue reorders automatically based on patient arrival times."
                />
                <FeatureItem 
                  icon={<ShieldCheck className="w-5 h-5 text-zinc-900 dark:text-zinc-50" />}
                  title="Privacy First"
                  description="Short-lived tokens and location data that vanishes after the visit."
                />
                <FeatureItem 
                  icon={<Zap className="w-5 h-5 text-zinc-900 dark:text-zinc-50" />}
                  title="Smart Waitlist"
                  description="Auto-fill cancelled slots with the nearest available patients."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <Link href="/login" className="group">
                <Card className="hover:border-zinc-900 dark:hover:border-zinc-50 transition-all cursor-pointer overflow-hidden relative border-amber-100 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-900/10">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                    <Stethoscope className="w-24 h-24" />
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-amber-900 dark:text-amber-100">
                      Medical Staff Portal
                      <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                    </CardTitle>
                    <CardDescription className="text-amber-700/70 dark:text-amber-300/50">Manage your live queue and consult with patients seamlessly.</CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/admin/queue" className="group">
                <Card className="hover:border-zinc-900 dark:hover:border-zinc-50 transition-all cursor-pointer overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                    <Users className="w-24 h-24" />
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Administration Center
                      <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                    </CardTitle>
                    <CardDescription>Full override control, waitlist management, and system settings.</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center">
                <span className="text-zinc-50 dark:text-zinc-900 font-bold text-sm">Q</span>
              </div>
              <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                QueueSense
              </span>
              <span className="mx-2 text-zinc-300">|</span>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{hospitalName}</span>
            </div>
            
            <div className="text-zinc-500 text-sm">
              &copy; {new Date().getFullYear()} QueueSense Systems. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, description, trend, isLive }: any) {
  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50">
            {icon}
          </div>
          {isLive && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
        </div>
        <p className="text-xs text-zinc-500">
          {description}
          {trend && <span className="ml-2 text-emerald-600 font-medium">{trend}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

function FeatureItem({ icon, title, description }: any) {
  return (
    <div className="flex gap-4 group">
      <div className="flex-shrink-0 w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center group-hover:bg-zinc-900 dark:group-hover:bg-zinc-50 group-hover:text-zinc-50 dark:group-hover:text-zinc-900 transition-colors">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-zinc-900 dark:text-zinc-50">{title}</h4>
        <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
