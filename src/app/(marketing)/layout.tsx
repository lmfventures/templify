import Link from 'next/link';
import { APP_NAME, ROUTES } from '@/config/constants';

/** Route-group layout: the marketing chrome never renders inside /dashboard. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <Link href={ROUTES.home} className="text-sm font-semibold">
          {APP_NAME}
        </Link>
        <Link href={ROUTES.dashboard} className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
          Dashboard →
        </Link>
      </header>
      <main className="flex-1 py-10">{children}</main>
      <footer className="py-6 text-xs text-neutral-400">Built with the App Router.</footer>
    </div>
  );
}
