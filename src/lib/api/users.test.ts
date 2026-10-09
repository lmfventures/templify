import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/lib/api/instances', () => ({
  api: { get, post, put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import type { CreateUserInput } from '@/types/user';
import { ApiError } from './errors';
import { usersApi } from './users';

const ada = { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' };

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('usersApi.list', () => {
  it('applies the default page and page size when called with no argument', async () => {
    get.mockResolvedValue([ada]);

    await expect(usersApi.list()).resolves.toEqual([ada]);
    expect(get).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({ params: { _page: 1, _limit: 20 } }),
    );
  });

  it('maps pageSize onto _limit and tags the read for revalidation', async () => {
    get.mockResolvedValue([ada]);

    await usersApi.list({ pageSize: 4 });

    expect(get).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({
        params: { _page: 1, _limit: 4 },
        next: { revalidate: 60, tags: ['users'] },
      }),
    );
  });

  it('rejects an out-of-range pageSize with a 422 and sends nothing', async () => {
    const error = await usersApi.list({ pageSize: 500 }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: 'validation_error' });
    expect((error as ApiError).fields?.pageSize).toBeDefined();
    expect(get).not.toHaveBeenCalled();
  });
});

describe('usersApi.byId', () => {
  it('reads /users/:id with a per-user cache tag', async () => {
    get.mockResolvedValue(ada);

    await expect(usersApi.byId(3)).resolves.toEqual(ada);
    expect(get).toHaveBeenCalledWith(
      '/users/3',
      expect.objectContaining({ next: { revalidate: 60, tags: ['users', 'user:3'] } }),
    );
  });
});

describe('usersApi.create', () => {
  it('rejects invalid input with field messages and sends nothing', async () => {
    const error = await usersApi
      .create({ name: 'A', email: 'nope' })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: 'validation_error' });
    expect((error as ApiError).fields?.name).toBeDefined();
    expect((error as ApiError).fields?.email).toBeDefined();
    expect(post).not.toHaveBeenCalled();
  });

  it('posts only the validated fields, uncached', async () => {
    post.mockResolvedValue(ada);
    const input = { name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' };

    await expect(usersApi.create(input as CreateUserInput)).resolves.toEqual(ada);
    expect(post).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({
        body: { name: 'Ada Lovelace', email: 'ada@example.com' },
        cache: 'no-store',
      }),
    );
  });
});
