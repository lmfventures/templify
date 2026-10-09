import type { ZodType } from 'zod';
import { ApiError } from '@/lib/api/errors';

/**
 * Parses `input` against `schema`, or throws the app's 422. Resource functions
 * in `src/lib/api/*` call this before any request goes out, so an invalid input
 * never reaches the upstream and a form gets field messages it can render.
 *
 * Field messages are keyed by the issue's dotted path; a root-level issue (a
 * cross-field `.refine()`, say) keys as `_`.
 */
export function parseOrThrow<T>(schema: ZodType<T>, input: unknown, message: string): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fields: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join('.') || '_';
    (fields[key] ??= []).push(issue.message);
  }

  throw new ApiError({ message, status: 422, code: 'validation_error', fields });
}
