import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { initials } from '@/lib/utils/format';
import type { User } from '@/types/user';

/** Presentational: takes data, renders it. No fetching. */
export function UserCard({ user }: { user: User }) {
  return (
    <Card className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold dark:bg-neutral-800"
      >
        {initials(user.name)}
      </span>
      <div className="min-w-0">
        <CardTitle className="truncate">{user.name}</CardTitle>
        <CardDescription className="truncate">{user.email}</CardDescription>
      </div>
    </Card>
  );
}
