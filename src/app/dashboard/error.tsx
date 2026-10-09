'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with your reporting client (Sentry, etc.).
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4" role="alert">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-neutral-500">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
