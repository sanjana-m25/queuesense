import React from 'react';
import { validateConsentToken } from '@/lib/tokens';
import PositionDisplay from '@/components/patient/PositionDisplay';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface PatientStatusPageProps {
  searchParams: Promise<{ token?: string }>;
}

/**
 * Patient Status Page
 * Displays the current queue position and status to the patient.
 */
export default async function PatientStatusPage({ searchParams }: PatientStatusPageProps) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 text-center">
        <Card className="max-w-sm">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Invalid Link</h1>
            <p className="text-zinc-500">Missing a valid security token.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 1. Validate Token
  const validation = await validateConsentToken(token);

  if (!validation.valid) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 text-center">
        <Card className="max-w-sm">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Link Expired</h1>
            <p className="text-zinc-500">
              For your privacy, this queue tracking link has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      <PositionDisplay token={token} />
    </div>
  );
}
