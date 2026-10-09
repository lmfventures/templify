'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { userQueries } from '@/lib/queries/users';
import { UserDetail } from './user-detail';
import { UserList } from './user-list';

/**
 * Client-side counterpart to the server-rendered list: reads through TanStack
 * Query, filters locally. Shows the loading/error/empty triad.
 */
export function UserSearch() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const debouncedQuery = useDebounce(query);
  const { data, error, isPending, isFetching, refetch } = useQuery(
    userQueries.list({ pageSize: 10 }),
  );

  const filtered = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    if (!needle) return data ?? [];

    return (data ?? []).filter(
      (user) =>
        user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle),
    );
  }, [data, debouncedQuery]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search users…"
          aria-label="Search users"
        />
        <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Spinner /> : 'Refresh'}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      ) : isPending ? (
        <p className="flex items-center gap-2 text-sm text-neutral-500">
          <Spinner /> Loading users…
        </p>
      ) : (
        <UserList users={filtered} onSelect={(user) => setSelectedId(user.id)} />
      )}

      <UserDetail userId={selectedId} />
    </div>
  );
}
