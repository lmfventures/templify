import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { parseOrThrow } from './parse';

function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to throw');
}

describe('parseOrThrow', () => {
  it('returns the parsed value with defaults applied', () => {
    const schema = z.object({ page: z.coerce.number().int().default(1) });

    expect(parseOrThrow(schema, {}, 'Invalid query parameters')).toEqual({ page: 1 });
  });

  it('throws a 422 validation_error ApiError carrying the given message', () => {
    const error = thrownBy(() =>
      parseOrThrow(z.object({ email: z.string().email() }), { email: 'nope' }, 'Invalid request body'),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'validation_error',
      message: 'Invalid request body',
    });
    expect((error as ApiError).fields?.email).toHaveLength(1);
  });

  it('keys a nested issue by its dotted path', () => {
    const schema = z.object({ a: z.object({ b: z.string() }) });

    const error = thrownBy(() => parseOrThrow(schema, { a: { b: 1 } }, 'Invalid'));

    expect((error as ApiError).fields).toHaveProperty(['a.b']);
  });

  it('keys a root-level refine issue as "_"', () => {
    const schema = z
      .object({ name: z.string(), email: z.string() })
      .refine((value) => value.name !== value.email, 'Name and email must differ');

    const error = thrownBy(() => parseOrThrow(schema, { name: 'x', email: 'x' }, 'Invalid'));

    expect((error as ApiError).fields).toEqual({ _: ['Name and email must differ'] });
  });
});
