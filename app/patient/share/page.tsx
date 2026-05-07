import React from 'react';
import { validateConsentToken } from '@/lib/tokens';
import ConsentScreen from '@/components/patient/ConsentScreen';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface PatientSharePageProps {
  searchParams: Promise<{ token?: string }>;
}

/**
 * Patient Share Page
 * Entry point for patients to provide consent for location tracking.
 * This page is server-rendered to validate the token before showing the UI.
 */
export default async function PatientSharePage({ searchParams }: PatientSharePageProps) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 text-center">
        <Card className="max-w-sm">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Invalid Link</h1>
            <p className="text-zinc-500">The link you followed is missing a valid security token.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 1. Validate Token (Server-side)
  const validation = await validateConsentToken(token);

  if (!validation.valid) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 text-center">
        <Card className="max-w-sm">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Link Expired</h1>
            <p className="text-zinc-500">
              For your privacy, this location-sharing link has expired. Please contact the clinic if you need a new one.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Fetch basic appointment details for display (validation object has appointmentId)
  // We'll pass the validation data and token to the client component
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      <ConsentScreen 
        token={token} 
        appointmentId={validation.appointmentId!} 
      />
    </div>
  );
}
