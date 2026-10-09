'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { userQueries } from '@/lib/queries/users';

/** Renders nothing until a user is selected, so the detail query never runs unasked. */
export function UserDetail({ userId }: { userId: number | null }) {
  if (userId === null) return null;

  return <UserDetailPanel userId={userId} />;
}

function UserDetailPanel({ userId }: { userId: number }) {
  const { data, error, isPending, isError } = useQuery(userQueries.detail(userId));

  if (isPending) return <Spinner />;

  if (isError) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {error.message}
      </p>
    );
  }

  return (
    <Card>
      <CardTitle>{data.name}</CardTitle>
      <CardDescription>{data.email}</CardDescription>
      <CardDescription>User #{data.id}</CardDescription>
    </Card>
  );
}
