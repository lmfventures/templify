import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { createQueryClient } from './client';

/** Pulls the retry predicate out of the defaults, failing loudly if it is not one. */
function retryPredicate() {
  const retry = createQueryClient().getDefaultOptions().queries?.retry;

  if (typeof retry !== 'function') {
    throw new Error('expected a retry predicate on the default query options');
  }

  return retry;
}

describe('createQueryClient', () => {
  it('never retries a 4xx ApiError', () => {
    const retry = retryPredicate();

    expect(retry(0, new ApiError({ message: 'no such user', status: 404 }))).toBe(false);
    expect(retry(0, new ApiError({ message: 'timed out', status: 408 }))).toBe(false);
  });

  it('retries a 5xx ApiError twice, then gives up', () => {
    const retry = retryPredicate();
    const error = new ApiError({ message: 'upstream down', status: 503 });

    expect(retry(0, error)).toBe(true);
    expect(retry(1, error)).toBe(true);
    expect(retry(2, error)).toBe(false);
  });

  it('keeps the client stale window aligned with the server revalidate window', () => {
    expect(createQueryClient().getDefaultOptions().queries?.staleTime).toBe(60_000);
  });
});
