import type { z } from 'zod';
import type {
  createUserSchema,
  listUsersQuerySchema,
  userSchema,
} from '@/lib/validators/user';

export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Query params for a list read. Inferred from the validator (invariant #5) and
 * made partial because every field has a server-side default.
 */
export type ListUsersParams = Partial<z.infer<typeof listUsersQuerySchema>>;
