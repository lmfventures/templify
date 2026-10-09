import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/users';
import type { CreateUserInput, ListUsersParams } from '@/types/user';

/**
 * Browser-side reads for the `users` resource.
 *
 * Three rules hold for every resource in this app:
 *   1. The key mirrors the resource and its params — ['users', 'list', params].
 *      Params are always one object; TanStack hashes it order-independently.
 *   2. Key and fetcher are declared together, so a key cannot drift from the
 *      function that fills it.
 *   3. Invalidating `all()` reaches lists and details alike.
 *
 * Fetchers delegate to `src/lib/api/users.ts`, which owns the upstream paths,
 * param mapping and schemas. Server Components call that module directly.
 */
export const userQueries = {
  all: () => ['users'] as const,

  lists: () => [...userQueries.all(), 'list'] as const,

  list: (params: ListUsersParams = {}) =>
    queryOptions({
      queryKey: [...userQueries.lists(), params] as const,
      queryFn: () => usersApi.list(params),
    }),

  details: () => [...userQueries.all(), 'detail'] as const,

  detail: (id: number) =>
    queryOptions({
      queryKey: [...userQueries.details(), id] as const,
      queryFn: () => usersApi.byId(id),
    }),
};

/**
 * Mutations take the QueryClient and own their own invalidation, so forgetting
 * to invalidate means deliberately not using the factory. Invalidating `all()`
 * reaches both the lists and any cached detail.
 */
export const userMutations = {
  create: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: (input: CreateUserInput) => usersApi.create(input),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: userQueries.all() }),
    }),
};
