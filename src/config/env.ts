import { z } from 'zod';

/**
 * Server-only environment variables. Nothing secret is needed today; this is
 * where one goes (read it through `serverEnv()` from a `server-only` module).
 * Parsed lazily so importing this file from the browser never blows up.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

/**
 * Variables that are safe to ship to the browser.
 * Must be referenced literally (`process.env.NEXT_PUBLIC_*`) so Next can inline them.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default('https://jsonplaceholder.typicode.com'),
});

function parse<T extends z.ZodTypeAny>(schema: T, input: unknown, label: string): z.infer<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid ${label} environment variables:\n${issues}`);
  }

  return result.data;
}

export const clientEnv = parse(
  clientSchema,
  { NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL },
  'client',
);

/**
 * Lazily parsed: importing this module from a Client Component must not
 * blow up because server-only vars are absent from the browser bundle.
 */
let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

export function serverEnv(): z.infer<typeof serverSchema> {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() was called in the browser. Use clientEnv instead.');
  }

  cachedServerEnv ??= parse(serverSchema, process.env, 'server');
  return cachedServerEnv;
}
