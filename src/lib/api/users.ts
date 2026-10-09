import { parseOrThrow } from '@/lib/validators/parse';
import {
  createUserSchema,
  listUsersQuerySchema,
  userListSchema,
  userSchema,
} from '@/lib/validators/user';
import type { CreateUserInput, ListUsersParams, User } from '@/types/user';
import { api } from './instances';

/**
 * Typed access to the upstream `users` resource, on server and browser alike.
 * Server Components await these directly; `src/lib/queries/users.ts` wraps them
 * for Client Components. This is the only module that knows the upstream paths.
 *
 * Every function is `async`, so a validation failure is always a rejected
 * promise — never a synchronous throw.
 */
export const usersApi = {
  async list(options: ListUsersParams = {}): Promise<User[]> {
    const { page, pageSize } = parseOrThrow(
      listUsersQuerySchema,
      options,
      'Invalid query parameters',
    );

    return api.get('/users', {
      params: { _page: page, _limit: pageSize },
      schema: userListSchema,
      next: { revalidate: 60, tags: ['users'] },
    });
  },

  async byId(id: number): Promise<User> {
    return api.get(`/users/${id}`, {
      schema: userSchema,
      next: { revalidate: 60, tags: ['users', `user:${id}`] },
    });
  },

  async create(input: CreateUserInput): Promise<User> {
    const body = parseOrThrow(createUserSchema, input, 'Invalid request body');

    return api.post('/users', {
      body,
      schema: userSchema,
      cache: 'no-store',
    });
  },
};
