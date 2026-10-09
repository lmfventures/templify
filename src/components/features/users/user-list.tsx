import type { User } from '@/types/user';
import { UserCard } from './user-card';

/**
 * Presentational. `onSelect` is optional so a Server Component can keep
 * rendering this list without passing a function across the boundary.
 */
export function UserList({
  users,
  onSelect,
}: {
  users: User[];
  onSelect?: (user: User) => void;
}) {
  if (users.length === 0) {
    return <p className="text-sm text-neutral-500">No users found.</p>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {users.map((user) => (
        <li key={user.id}>
          {onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(user)}
              className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              <UserCard user={user} />
            </button>
          ) : (
            <UserCard user={user} />
          )}
        </li>
      ))}
    </ul>
  );
}
