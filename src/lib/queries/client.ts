import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';

/**
 * The one place client-side cache and retry policy is set.
 *
 * `staleTime` deliberately matches the `next: { revalidate: 60 }` used by
 * `src/lib/api/users.ts`, so both cache layers tell the same story. Retrying is
 * decided by `ApiError.status`: a 404 or a 422 will never succeed on a second
 * attempt, so retrying one is pure latency.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
}
