import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            QueueSense
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Adaptive OPD Management System
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
