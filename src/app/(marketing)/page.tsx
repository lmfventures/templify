import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { APP_NAME, ROUTES } from '@/config/constants';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{APP_NAME}</h1>
      <p className="max-w-prose text-neutral-500 dark:text-neutral-400">
        A minimal Next.js boilerplate: thin routes, one typed REST client for server and browser,
        zod-validated boundaries, and feature-scoped components.
      </p>
      <Link href={ROUTES.dashboard}>
        <Button>Open the dashboard</Button>
      </Link>
    </div>
  );
}
