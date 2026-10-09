import { Suspense } from 'react';
import { UserCreateForm } from '@/components/features/users/user-create-form';
import { UserList } from '@/components/features/users/user-list';
import { UserSearch } from '@/components/features/users/user-search';
import { Spinner } from '@/components/ui/spinner';
import { usersApi } from '@/lib/api/users';

export const metadata = { title: 'Dashboard' };

/**
 * Server Component: awaits the typed API function directly — no client-side
 * loading state. A thrown `ApiError` bubbles to error.tsx.
 */
async function ServerRenderedUsers() {
  const users = await usersApi.list({ pageSize: 4 });
  return <UserList users={users} />;
}

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-500">Two ways to read the same resource.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Server Component · usersApi.list()
        </h2>
        <Suspense fallback={<Spinner />}>
          <ServerRenderedUsers />
        </Suspense>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Client · TanStack Query → usersApi.list()
        </h2>
        <UserCreateForm />
        <UserSearch />
      </section>
    </div>
  );
}
