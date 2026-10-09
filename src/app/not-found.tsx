import Link from 'next/link';
import { ROUTES } from '@/config/constants';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 space-y-3">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link href={ROUTES.home} className="text-sm underline">
        Back home
      </Link>
    </div>
  );
}
