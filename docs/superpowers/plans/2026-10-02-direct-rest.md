# Direct REST Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

| | |
|---|---|
| **Status** | `Complete` |
| **Created** | 2026-10-02 |
| **Updated** | 2026-10-02 |
| **Owner** | juni |
| **Branch / worktree** | `feat/direct-rest` — created via `superpowers:using-git-worktrees` |
| **Spec** | `docs/superpowers/specs/2026-10-02-direct-rest-design.md` |
| **Ledger** | `.superpowers/sdd/2026-10-02-direct-rest/progress.md` |

**Status values:** `Draft` → `Approved` → `In Progress` → `Complete`.
Off-ramps: `Blocked` (say what unblocks it in Decision Log) · `Abandoned`.

Update **Status**, **Updated**, and the Progress table as work lands. Whoever
executes this plan owns keeping it accurate — a stale plan misleads the next
session more than no plan at all.

**Goal:** Remove the BFF so the browser and Server Components both call the upstream REST API through one client.

**Architecture:** One configured client, `api` in `src/lib/api/instances.ts`, and one module per resource, `src/lib/api/<name>.ts`, that works on server and browser alike. Server Components await `usersApi` directly. TanStack query factories wrap the same functions. Input validation moves from the route handlers into the resource functions via `parseOrThrow`. Route handlers, the `{ data }` envelope, `bff()` and `http.ts` are deleted.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript (strict) · zod 4 · axios (fetch adapter) · TanStack Query 5 · Vitest + Testing Library · Tailwind v4

---

## Progress

| # | Task | Status | Started | Completed | Commit |
|---|---|---|---|---|---|
| 1 | `parseOrThrow` validation helper | ✅ Complete | 2026-10-02 | 2026-10-02 | e795973 |
| 2 | Direct `api` client and isomorphic `usersApi` | ✅ Complete | 2026-10-02 | 2026-10-02 | a895702 |
| 3 | Query factories call `usersApi`; delete the BFF | ✅ Complete | 2026-10-02 | 2026-10-02 | 8e2523e |
| 4 | Drop envelope parsing from `client.ts` | ✅ Complete | 2026-10-02 | 2026-10-02 | 77d1178 |
| 5 | Docs: CLAUDE.md, README, copy, templates | ✅ Complete | 2026-10-02 | 2026-10-02 | e6a94de |

Legend: ⬜ Not started · 🔄 In progress · 🔁 Fix round *R*/5 · ✅ Complete · ⛔ Blocked · ⏭️ Descoped

---

## Global Constraints

Copied verbatim from the spec.

- Verification gate: `rm -rf .next && npm run typecheck && npm run lint && npm run build && npm test`
  passes with fresh output before any task is claimed complete.
- The architecture invariants in `CLAUDE.md` are binding. Once the CLAUDE.md
  task lands, the invariants in this spec's **Architecture** section are the
  ones in force.
- `adapter: 'fetch'` in `src/lib/api/client.ts` must not change.
- No new runtime dependencies. `server-only` stays in `package.json`.
- Next 16 / React 19 rules from CLAUDE.md apply. The React Compiler lint rules
  are errors.
- Default upstream stays `https://jsonplaceholder.typicode.com`, so the repo
  runs with no `.env`.
- Commits use conventional prefixes and end with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

Plan-level note: until Task 5 rewrites CLAUDE.md, invariants 3, 4, 6 and 8 there
still describe the BFF. **The spec's Architecture section wins wherever the two
disagree.**

## Review Focus

Inputs and failure modes the spec implies but its own test list doesn't
exercise. Each one is pinned by a test in the task named.

1. `usersApi.list()` called with **no argument**, as a Server Component might.
   Expected: the defaults apply (`_page: 1`, `_limit: 20`) and no 422. A bare
   `parseOrThrow(schema, undefined)` would reject. → Task 2.
2. Create input carrying **unknown keys** (`{ name, email, role: 'admin' }`).
   Expected: zod strips them, and the upstream body is exactly `{ name, email }`.
   → Task 2.
3. **Out-of-range list params from a client query** (`pageSize: 500`).
   Expected: a 422 with no HTTP request, and **no retry**, since the QueryClient
   policy skips retries below 500. → Task 3.
4. An **upstream error body in the old envelope shape** (`{ error: { message, code, fields } }`).
   Expected: the message is kept, `code` comes from the HTTP status (the
   upstream's own code is ignored), and `fields` is undefined. → Task 4.
5. **Resource functions always reject, never throw synchronously.** A
   validation failure has to come back as a rejected promise, so callers'
   `.catch` and `await expect(...).rejects` both work. → Task 2 (every
   validation test uses `.rejects`, and the functions are `async`).

---

## File Structure

**Create**
- `src/lib/validators/parse.ts` — `parseOrThrow`: zod failure → `ApiError` 422 with `fields`.
- `src/lib/validators/parse.test.ts` — the field-keying rules.
- `src/lib/api/users.test.ts` — URL, param mapping, cache tags, and input validation for `usersApi`.

**Modify**
- `src/lib/validators/index.ts` — re-export `parse`.
- `src/config/env.ts`, `.env.example` — `NEXT_PUBLIC_API_BASE_URL` in; `API_BASE_URL`, `API_TOKEN`, `NEXT_PUBLIC_APP_URL` out.
- `src/lib/api/instances.ts` — the single `api` client.
- `src/lib/api/users.ts` — isomorphic; validates its inputs.
- `src/lib/api/index.ts` — exports `api`.
- `src/lib/api/client.ts`, `src/lib/api/client.test.ts` — no envelope parsing.
- `src/lib/api/errors.ts` — doc comment only.
- `src/lib/queries/users.ts`, `src/lib/queries/users.test.ts`, `src/lib/queries/index.ts` — fetchers delegate to `usersApi`.
- `src/types/api.ts` — `ApiResponse` removed.
- `src/lib/utils/index.ts` — `http` note removed.
- Component tests: `src/components/features/users/{user-create-form,user-detail,user-search}.test.tsx` — mock `api` with raw payloads.
- Copy only: `user-search.tsx`, `user-create-form.tsx`, `src/app/dashboard/page.tsx`, `src/app/(marketing)/page.tsx`.
- Docs: `CLAUDE.md`, `README.md`, `docs/superpowers/specs/TEMPLATE.md`, `docs/superpowers/plans/TEMPLATE.md`.

**Delete**
- `src/lib/api/instances.server.ts`
- `src/app/api/` (whole directory, including `route.test.ts`)
- `src/lib/queries/bff.ts`, `src/lib/queries/bff.test.ts`
- `src/lib/utils/http.ts`

Tasks are ordered so the build stays green after every commit. Task 2 adds
`api` next to the old `internalApi`, and Task 3 removes the old path.

---

## Task 1: `parseOrThrow` validation helper

**Status:** ✅ Complete · **Started:** 2026-10-02 · **Completed:** 2026-10-02

**Files:**
- Create: `src/lib/validators/parse.ts`
- Modify: `src/lib/validators/index.ts`
- Test: `src/lib/validators/parse.test.ts`

**Interfaces:**
- Consumes: `ApiError` from `src/lib/api/errors.ts` (existing; constructor takes `{ message, status, code?, fields?, url?, cause? }`).
- Produces: `export function parseOrThrow<T>(schema: ZodType<T>, input: unknown, message: string): T`. It returns the parsed data with defaults applied. On failure it throws `ApiError` with `status: 422`, `code: 'validation_error'`, the given `message`, and `fields: Record<string, string[]>`, keyed by the issue's dotted path (`'_'` for a root-level issue).

- [x] **Step 1: Write the failing test**

`src/lib/validators/parse.test.ts`:

```ts
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
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/validators/parse.test.ts`
Expected: FAIL — `Failed to resolve import "./parse"`

- [x] **Step 3: Write the implementation**

`src/lib/validators/parse.ts`:

```ts
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
```

`src/lib/validators/index.ts` becomes:

```ts
export * from './parse';
export * from './user';
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/validators/parse.test.ts`
Expected: PASS — 4 passed

- [x] **Step 5: Verify the repo is clean**

Run: `npm run typecheck && npm run lint && npm test`
Expected: exit 0; all suites pass

- [x] **Step 6: Commit**

```bash
git add src/lib/validators/parse.ts src/lib/validators/parse.test.ts src/lib/validators/index.ts
git commit -m "feat: add parseOrThrow validation helper

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 2: Direct `api` client and isomorphic `usersApi`

**Status:** ✅ Complete · **Started:** 2026-10-02 · **Completed:** 2026-10-02

**Files:**
- Modify: `src/config/env.ts`, `.env.example`
- Modify: `src/lib/api/instances.ts`, `src/lib/api/users.ts`, `src/lib/api/index.ts`
- Delete: `src/lib/api/instances.server.ts`
- Test: `src/lib/api/users.test.ts` (new)

**Interfaces:**
- Consumes: `parseOrThrow` (Task 1); `createApiClient(config): ApiClient` from `src/lib/api/client.ts`; `listUsersQuerySchema`, `createUserSchema`, `userSchema`, `userListSchema` from `src/lib/validators/user.ts`; `User`, `CreateUserInput`, `ListUsersParams` from `src/types/user.ts`.
- Produces:
  - `clientEnv.NEXT_PUBLIC_API_BASE_URL: string` (defaults to `'https://jsonplaceholder.typicode.com'`).
  - `export const api: ApiClient` from `src/lib/api/instances.ts`.
  - `usersApi.list(options?: ListUsersParams): Promise<User[]>` → `api.get('/users', { params: { _page, _limit }, schema: userListSchema, next: { revalidate: 60, tags: ['users'] } })`.
  - `usersApi.byId(id: number): Promise<User>` → `api.get(\`/users/${id}\`, { schema: userSchema, next: { revalidate: 60, tags: ['users', \`user:${id}\`] } })`.
  - `usersApi.create(input: CreateUserInput): Promise<User>` → `api.post('/users', { body: parsed, schema: userSchema, cache: 'no-store' })`.
  - All three are `async`, so a validation failure is a rejected promise.
  - `internalApi` **stays** in `instances.ts` for this task only, because `bff.ts` still uses it. Task 3 removes it.

- [x] **Step 1: Write the failing test**

`src/lib/api/users.test.ts`:

```ts
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
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/api/users.test.ts`
Expected: FAIL. `users.ts` still starts with `import 'server-only'`, which throws when imported outside a React Server environment. If it got past that, it would call the unmocked `externalApi` rather than the mocked `api`, so the `get`/`post` assertions would fail anyway.

- [x] **Step 3: Update the env schema and `.env.example`**

In `src/config/env.ts`, replace `serverSchema` and `clientSchema` and the `clientEnv` parse input:

```ts
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
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});
```

```ts
export const clientEnv = parse(
  clientSchema,
  {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  'client',
);
```

(Leave `NEXT_PUBLIC_APP_URL` in place for now. `internalApi` still reads it, and Task 3 removes both.)

Replace `.env.example` entirely with:

```bash
# Upstream REST API. Called directly from the browser and from Server
# Components (src/lib/api/instances.ts), so it is public — never put a secret here.
NEXT_PUBLIC_API_BASE_URL="https://jsonplaceholder.typicode.com"

# Public origin, used for absolute internal fetches during SSR.
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [x] **Step 4: Add `api` and delete `instances.server.ts`**

Replace `src/lib/api/instances.ts` with:

```ts
import { createApiClient } from './client';
import { clientEnv } from '@/config/env';

/**
 * The app's one configured client. It talks to the upstream REST API directly,
 * from Server Components and from the browser alike, so it ships to the browser
 * and must never carry a secret: no `serverEnv()`, no token. When a project
 * needs per-user auth, pass `headers` as a function here.
 */
export const api = createApiClient({
  baseUrl: clientEnv.NEXT_PUBLIC_API_BASE_URL,
  headers: { Accept: 'application/json' },
});

/** Reads this app's route handlers. Removed once the query factories use `api`. */
export const internalApi = createApiClient({
  baseUrl: typeof window === 'undefined' ? clientEnv.NEXT_PUBLIC_APP_URL : '',
  headers: { Accept: 'application/json' },
});
```

Run: `git rm src/lib/api/instances.server.ts`

- [x] **Step 5: Rewrite `usersApi`**

Replace `src/lib/api/users.ts` with:

```ts
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
```

In `src/lib/api/index.ts`, replace the line `export { externalApi } from './instances.server';` and the `internalApi` line with:

```ts
export { api, internalApi } from './instances';
```

- [x] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/lib/api/users.test.ts`
Expected: PASS — 6 passed

- [x] **Step 7: Verify the repo is clean**

Run: `rm -rf .next && npm run typecheck && npm run lint && npm run build && npm test`
Expected: exit 0. The build still lists `/api/users` and `/api/users/[id]` (they're removed in Task 3). All suites pass, including `route.test.ts`, which mocks `usersApi`.

- [x] **Step 8: Commit**

```bash
git add -A src/config/env.ts .env.example src/lib/api
git commit -m "refactor: call the upstream through one isomorphic api client

usersApi now runs on server and browser and validates its own inputs.
The server-only externalApi and API_TOKEN are gone.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 3: Query factories call `usersApi`; delete the BFF

**Status:** ✅ Complete · **Started:** 2026-10-02 · **Completed:** 2026-10-02

**Files:**
- Modify: `src/lib/queries/users.ts`, `src/lib/queries/index.ts`
- Modify: `src/lib/api/instances.ts`, `src/lib/api/index.ts`, `src/lib/api/errors.ts` (comment)
- Modify: `src/config/env.ts`, `.env.example`
- Modify: `src/types/api.ts`, `src/lib/utils/index.ts`
- Modify (copy only): `src/components/features/users/user-search.tsx`, `src/components/features/users/user-create-form.tsx`, `src/app/dashboard/page.tsx`
- Delete: `src/app/api/` (whole dir), `src/lib/queries/bff.ts`, `src/lib/queries/bff.test.ts`, `src/lib/utils/http.ts`
- Test: `src/lib/queries/users.test.ts`, `src/components/features/users/user-create-form.test.tsx`, `user-detail.test.tsx`, `user-search.test.tsx`

**Interfaces:**
- Consumes: `usersApi.list/byId/create` (Task 2); `api` (Task 2); `createQueryClient()` from `src/lib/queries/client.ts` (existing; retries only when `status >= 500`).
- Produces: `userQueries.list(params?: ListUsersParams)`, `userQueries.detail(id: number)` and `userMutations.create(queryClient)`. These have the same names, keys and invalidation as today; only their fetchers change. After this task, `internalApi`, `bff`, `BffOptions`, `ApiResponse`, `ok`, `fail`, `route`, `parseQuery` and `parseBody` no longer exist. The test seam is `vi.mock('@/lib/api/instances', () => ({ api: { get, post, put, patch, delete } }))`, with mocks resolving to **raw payloads**.

- [x] **Step 1: Rewrite the query factory tests (failing)**

In `src/lib/queries/users.test.ts`, change the mock and the `userQueries fetchers` block. Leave the `userQueries keys` block alone.

Replace lines 1–16 (imports through `beforeEach`) with:

```ts
import { QueryClient, hashKey } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/api/instances', () => ({
  api: { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { usersApi } from '@/lib/api/users';
import { createQueryClient } from './client';
import { userQueries } from './users';

const ada = { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' };

beforeEach(() => {
  get.mockReset();
});
```

Replace the whole `describe('userQueries fetchers', …)` block with:

```ts
describe('userQueries fetchers', () => {
  it('reads the list from /users with mapped params', async () => {
    get.mockResolvedValue([ada]);

    await expect(
      new QueryClient().fetchQuery(userQueries.list({ pageSize: 1 })),
    ).resolves.toEqual([ada]);
    expect(get).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({ params: { _page: 1, _limit: 1 } }),
    );
  });

  it('reads one user from /users/:id', async () => {
    get.mockResolvedValue(ada);

    await expect(new QueryClient().fetchQuery(userQueries.detail(1))).resolves.toEqual(ada);
    expect(get).toHaveBeenCalledWith('/users/1', expect.anything());
  });

  it('fails out-of-range params with a 422, without a request or a retry', async () => {
    const list = vi.spyOn(usersApi, 'list');

    const error = await createQueryClient()
      .fetchQuery(userQueries.list({ pageSize: 500 }))
      .catch((cause: unknown) => cause);

    expect(error).toMatchObject({ status: 422, code: 'validation_error' });
    expect(list).toHaveBeenCalledTimes(1);
    expect(get).not.toHaveBeenCalled();
    list.mockRestore();
  });
});
```

- [x] **Step 2: Rewrite the component tests (failing)**

In **each** of `user-create-form.test.tsx`, `user-detail.test.tsx` and `user-search.test.tsx`, change the mock factory key from `internalApi` to `api`:

```ts
vi.mock('@/lib/api/instances', () => ({
  api: { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
```

(In `user-create-form.test.tsx`, keep `post` as the hoisted mock: `api: { get, post, put: vi.fn(), patch: vi.fn(), delete: vi.fn() }`.)

Then unwrap every `{ data: X }` mock value to `X`, and point the paths at the upstream.

`user-detail.test.tsx`:
- `get.mockResolvedValue({ data: grace })` → `get.mockResolvedValue(grace)`
- `expect(get).toHaveBeenCalledWith('/api/users/3', { params: undefined, body: undefined })` → `expect(get).toHaveBeenCalledWith('/users/3', expect.anything())`

`user-search.test.tsx`:
- every `get.mockResolvedValue({ data: users })` → `get.mockResolvedValue(users)`
- the `mockImplementation` body becomes:
  ```ts
  get.mockImplementation((path: string) => {
    if (path === '/users/1') return Promise.resolve(users[0]);
    return Promise.resolve(users);
  });
  ```
- `expect(get).toHaveBeenCalledWith('/api/users/1', { params: undefined, body: undefined })` → `expect(get).toHaveBeenCalledWith('/users/1', expect.anything())`

`user-create-form.test.tsx`:
- `get.mockResolvedValue({ data: [] })` → `get.mockResolvedValue([])`; `{ data: [ada] }` → `[ada]`; `post.mockResolvedValue({ data: ada })` → `post.mockResolvedValue(ada)`.
- the post assertion becomes:
  ```ts
  expect(post).toHaveBeenCalledWith(
    '/users',
    expect.objectContaining({ body: { name: 'Ada Lovelace', email: 'ada@example.com' } }),
  );
  ```
- replace the test `'renders field messages from a 422'` with one that exercises the real validation:
  ```ts
  it('renders field messages from its own validation without sending a request', async () => {
    const user = userEvent.setup();

    renderWithQuery(<UserCreateForm />);
    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Add user' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(post).not.toHaveBeenCalled();
  });
  ```
- keep the `'surfaces a root-level (unkeyed) field message…'` test exactly as it is. It mocks `post` rejecting with an `ApiError` carrying `fields: { _: [...] }`, which is still the contract the form renders.

- [x] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/queries/users.test.ts src/components/features/users`
Expected: FAIL. The fetchers still call `bff('/api/users', …)` through `internalApi`, which the mocks no longer provide (`[vitest] No "internalApi" export is defined on the mock`).

- [x] **Step 4: Point the query factories at `usersApi`**

Replace `src/lib/queries/users.ts` with:

```ts
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
```

Replace `src/lib/queries/index.ts` with:

```ts
export { createQueryClient } from './client';
export { QueryProvider } from './provider';
export { userMutations, userQueries } from './users';
```

- [x] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/queries/users.test.ts src/components/features/users`
Expected: PASS — all tests in those files

- [x] **Step 6: Delete the BFF**

```bash
git rm -r src/app/api src/lib/queries/bff.ts src/lib/queries/bff.test.ts src/lib/utils/http.ts
```

Remove `internalApi` from `src/lib/api/instances.ts`. Delete the trailing `/** Reads this app's route handlers… */` comment and the `export const internalApi = …` block, so only `api` remains.

`src/lib/api/index.ts` export line becomes:

```ts
export { api } from './instances';
```

`src/config/env.ts`: remove `NEXT_PUBLIC_APP_URL` from `clientSchema` and from the `clientEnv` parse input, leaving:

```ts
const clientSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default('https://jsonplaceholder.typicode.com'),
});
```

```ts
export const clientEnv = parse(
  clientSchema,
  { NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL },
  'client',
);
```

`.env.example`: delete the last two lines (the `NEXT_PUBLIC_APP_URL` comment and value) and the blank line before them.

Replace `src/types/api.ts` with:

```ts
/** Error shape `ApiError` serializes to via `toBody()`. */
export interface ApiErrorBody {
  message: string;
  code: string;
  /** Field-level messages, keyed by field name. Present on validation failures. */
  fields?: Record<string, string[]>;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
```

Replace `src/lib/utils/index.ts` with:

```ts
export * from './cn';
export * from './format';
```

In `src/lib/api/errors.ts`, change the `toBody()` doc comment from
`/** Serializable body for \`app/api\` responses — never leaks stack traces. */` to
`/** Serializable form of this error — never leaks stack traces. */`.

- [x] **Step 7: Update copy that still says BFF**

- `src/components/features/users/user-search.tsx`: in the component's doc comment, change `reads through the BFF` to `reads through TanStack Query`.
- `src/components/features/users/user-create-form.tsx`: change the comment `// Field messages come from the BFF's 422 envelope, carried by ApiError.` to `// Field messages come from parseOrThrow's 422 in usersApi.create, carried by ApiError.`
- `src/app/dashboard/page.tsx`:
  - replace the `ServerRenderedUsers` doc comment with:
    ```ts
    /**
     * Server Component: awaits the typed API function directly — no client-side
     * loading state. A thrown `ApiError` bubbles to error.tsx.
     */
    ```
  - change the heading `Client · TanStack Query → /api/users` to `Client · TanStack Query → usersApi.list()`.

- [x] **Step 8: Verify nothing references the BFF**

Run: `grep -rnE "internalApi|externalApi|bff|app/api|API_TOKEN|(^|[^_])API_BASE_URL|NEXT_PUBLIC_APP_URL|ApiResponse" src`
Expected: no output, exit 1

- [x] **Step 9: Verify the repo is clean**

Run: `rm -rf .next && npm run typecheck && npm run lint && npm run build && npm test`
Expected: exit 0. The build's route list contains `/`, `/dashboard` and `/_not-found`, and **no** `/api/*` entry. All suites pass.

- [x] **Step 10: Check it in the real app**

Start the dev server with `preview_start` (add a `.claude/launch.json` entry `{ "name": "dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 3000 }` if none exists), open `/dashboard`, and check:
- `read_network_requests` with `urlPattern: "jsonplaceholder"` shows `GET https://jsonplaceholder.typicode.com/users?_page=1&_limit=10` from the browser. `urlPattern: "/api/"` shows nothing.
- Selecting a user card shows the detail card (`User #N`).
- Typing `Ada Lovelace` / `nope` and clicking **Add user** shows `Enter a valid email address` under Email, and no new `POST` appears in the network list.
- A valid name and email produce a `POST https://jsonplaceholder.typicode.com/users`, then a refetch of the list.

Stop the server afterwards.

- [x] **Step 11: Commit**

```bash
git add -A src .env.example
git commit -m "refactor: read and write directly from the browser, drop the BFF

Query factories delegate to usersApi. Route handlers, bff(), http.ts and
the { data } envelope are deleted.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 4: Drop envelope parsing from `client.ts`

**Status:** ✅ Complete · **Started:** 2026-10-02 · **Completed:** 2026-10-02

**Files:**
- Modify: `src/lib/api/client.ts`
- Test: `src/lib/api/client.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `createApiClient` keeps the same public API. On an HTTP error response, `ApiError.message` = `extractMessage(payload) ?? \`${method} ${path} failed with ${status}\``, `code` = `codeForStatus(status)` (applied by the `ApiError` constructor when `code` is omitted), and `fields` = `undefined`.

- [x] **Step 1: Replace the envelope tests (failing)**

In `src/lib/api/client.test.ts`, inside `describe('createApiClient error handling', …)`, delete the two tests `'carries code and fields from an error envelope onto the ApiError'` and `'ignores a malformed error key rather than trusting it'`, and add in their place:

```ts
  it('keeps the message from an { error } body but derives code from the status', async () => {
    respondWith(409, {
      error: {
        message: 'Email already taken',
        code: 'email_taken',
        fields: { email: ['Email already taken'] },
      },
    });

    const error = await client.get('/users').catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'conflict', message: 'Email already taken' });
    expect((error as ApiError).fields).toBeUndefined();
  });
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/api/client.test.ts`
Expected: FAIL. The new test gets `code: 'email_taken'` and a defined `fields`, because `errorEnvelope` still trusts the body.

- [x] **Step 3: Remove the envelope parsing**

In `src/lib/api/client.ts`:
- delete `import type { ApiErrorBody } from '@/types/api';`
- in `toApiError`, replace the `if (response) { … }` block with:

  ```ts
  if (response) {
    const payload = normalizeBody(response.data, response.status);

    return new ApiError({
      message: extractMessage(payload) ?? `${method} ${path} failed with ${response.status}`,
      status: response.status,
      url,
    });
  }
  ```
- delete the functions `errorEnvelope` and `isFieldMap` and their doc comments.
- in the comment at the top of `toApiError`, change ``(`serverEnv()` on an`` / ``incomplete environment, say)`` to ``(a `headers` function that`` / ``cannot resolve its token, say)``.

- [x] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/api/client.test.ts`
Expected: PASS — all tests in the file

- [x] **Step 5: Verify the repo is clean**

Run: `rm -rf .next && npm run typecheck && npm run lint && npm run build && npm test`
Expected: exit 0; all suites pass

- [x] **Step 6: Commit**

```bash
git add src/lib/api/client.ts src/lib/api/client.test.ts
git commit -m "refactor: stop parsing the retired error envelope in the api client

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 5: Docs — CLAUDE.md, README, copy, templates

**Status:** ✅ Complete · **Started:** 2026-10-02 · **Completed:** 2026-10-02

**Files:**
- Modify: `CLAUDE.md`, `README.md`, `src/app/(marketing)/page.tsx`, `docs/superpowers/specs/TEMPLATE.md`, `docs/superpowers/plans/TEMPLATE.md`
- Modify: `docs/superpowers/specs/2026-10-02-direct-rest-design.md` (status block only)

**Interfaces:**
- Consumes: the names that exist after Tasks 1–4: `api`, `usersApi`, `parseOrThrow`, `userQueries`, `NEXT_PUBLIC_API_BASE_URL`.
- Produces: documentation only.

- [x] **Step 1: CLAUDE.md — intro and invariants**

Replace the intro sentence `Minimal Next.js App Router boilerplate: thin routes, a typed API layer behind a` / `BFF, zod-validated boundaries.` with:

```
Minimal Next.js App Router boilerplate: thin routes, one typed REST client shared
by Server Components and the browser, zod-validated boundaries.
```

Replace the whole numbered list under `## Architecture invariants` (items 1–8) with:

```markdown
1. **One HTTP client in the app.** Only `src/lib/api/client.ts` performs HTTP.
   It wraps axios; no other module imports `axios` or calls `fetch`.
   Everything else goes through the one configured client, `api` from
   `src/lib/api/instances.ts`, which calls the upstream REST API directly from
   Server Components and the browser alike.
   The axios instance is pinned to `adapter: 'fetch'` — that is load-bearing,
   not stylistic. The default Node adapter drives `http` directly and would
   bypass the `fetch` Next.js patches, silently dropping `next: { revalidate,
   tags }` and breaking revalidation. Do not change the adapter.
2. **Routes are thin.** Files under `src/app/` compose components and await a
   `src/lib/api/*` function. No business logic, no upstream URLs, no `fetch`.
   The UI never reads its own route handlers, so `src/app/` has no `api/`
   directory. A handler is only for things outside the app's data path
   (webhooks, OG images).
3. **Resource modules own the wire.** `src/lib/api/<name>.ts` holds the upstream
   path, the query-param mapping, input validation (`parseOrThrow` from
   `src/lib/validators/parse.ts`) and the response schema. Nothing else knows an
   upstream URL. Its functions are `async`, so a validation failure rejects.
4. **Payloads are returned unwrapped.** Resource functions return the
   schema-parsed upstream payload or throw `ApiError`. Nothing wraps responses
   in `{ data }`.
5. **Validators are the source of truth.** Shared types are *inferred*
   (`src/types/user.ts` ← `userSchema`). Never hand-write a type that a zod
   schema already describes.
6. **No secrets in `api`.** `api` and every `src/lib/api/<name>.ts` ship to the
   browser, and every `NEXT_PUBLIC_*` value is public. A secret lives only behind
   `serverEnv()` in a module whose first line is `import 'server-only'`, and no
   resource module or Client Component may import that module.
7. **`ApiError` is the only error currency.** Throw it with a `status`. Input
   validation throws 422 `validation_error` with `fields` via `parseOrThrow`.
8. **Client reads go through a query factory.** Client Components never call
   `api` or `<name>Api` directly. They use `useQuery(<name>Queries.<op>())` from
   `src/lib/queries/<name>.ts`, whose `queryFn` calls `<name>Api.<op>()`; the key
   and the fetcher are declared together in one `queryOptions()` call. Mutation
   factories take the `QueryClient` and own their own invalidation.

### Direct REST caveats

- The upstream must allow CORS from the app's origin.
- The upstream must not need a secret — anything in `api` is public.
- Backend load grows with viewers: there is no shared server cache in front of
  client reads. If the upstream rate-limits per IP behind a proxy, a busy page
  turns into 429s. A project that hits this may add a route handler as a cache
  for those reads only.
- Upstream error messages reach users unredacted.
```

- [x] **Step 2: CLAUDE.md — resource section and layout**

Replace the `### Adding a resource — always these five files` heading, its code block, and the paragraph after it (through `…Never import one from the other.`) with:

````markdown
### Adding a resource — always these four files

```
src/lib/validators/<name>.ts     zod schemas (+ input/query schemas)
src/types/<name>.ts              z.infer types, re-exported from types/index.ts
src/lib/api/<name>.ts            typed functions per operation, cache tags; server + browser
src/lib/queries/<name>.ts        query keys + queryOptions/mutationOptions wrapping lib/api
```

`lib/api/<name>.ts` runs on both sides: Server Components await it, and
`lib/queries/<name>.ts` wraps it for Client Components. Because it ships to the
browser it must never import a `server-only` module or call `serverEnv()`.
````

In the `### Layout` code block, change the two lines:

```
src/app/        routes only — (marketing) group, api/ handlers, dashboard/
src/lib/        api/ (server) · queries/ (browser) · hooks/ · utils/ · validators/
```

to:

```
src/app/        routes only — (marketing) group, dashboard/
src/lib/        api/ (client + resources) · queries/ (TanStack) · hooks/ · utils/ · validators/
```

- [x] **Step 3: CLAUDE.md — repo gotchas**

Replace the `**\`API_BASE_URL\`**` bullet with:

```markdown
- **`NEXT_PUBLIC_API_BASE_URL`** defaults to jsonplaceholder so the repo runs with
  no setup. The `users` resource is a reference example — delete it once real
  ones exist.
```

In the `**TanStack Query is client-only here.**` bullet, replace the final two sentences (from `Tests stub at the \`internalApi\` seam` to the end) with:

```
Tests stub at the `api` seam
  (`vi.mock('@/lib/api/instances', () => ({ api: { get, post, … } }))`), with
  mocks resolving to raw upstream payloads, never at global `fetch`; the one
  exception is `src/lib/api/client.test.ts`, which tests the wrapper itself.
```

- [x] **Step 4: README.md**

Make these replacements, in order:

1. Lines 20–21: `exercises the full` / `data path (route handler → typed API layer → upstream).` → `exercises both` / `data paths (Server Component and TanStack Query → typed API layer → upstream).`
2. The env table rows for `API_BASE_URL`, `API_TOKEN`, `NEXT_PUBLIC_APP_URL` → one row:
   `| \`NEXT_PUBLIC_API_BASE_URL\` | no | \`https://jsonplaceholder.typicode.com\` | Upstream REST API, called from the browser and the server. Public — never put a secret behind it. |`
3. Lines 57–59: `They stub the network at the \`internalApi\` seam` → `They stub the network at the \`api\` seam`.
4. Troubleshooting: replace the `Invalid server environment variables` bullet with `- **Boot dies with "Invalid client environment variables".** \`NEXT_PUBLIC_API_BASE_URL\` is set but is not a valid URL — the message names it.` and in the `serverEnv()` bullet change `move the call into a Server Component or route handler.` to `move the call into a module that starts with \`import 'server-only'\`.`
5. Structure tree: delete the three `api/` lines under `app/` (`api/ …(BFF layer)`, `users/route.ts`, `users/[id]/route.ts`); change `instances.ts            # internalApi — browser-safe, talks to this app's BFF` to `instances.ts            # api — the one configured client (server + browser)`; delete the `instances.server.ts` line; change `users.ts                # typed functions per resource` (under `api/`) to `users.ts                # usersApi — typed functions per operation`; delete the `bff.ts` line; change `utils/                    # cn, format, http (route-handler helpers)` to `utils/                    # cn, format`; change `validators/               # zod schemas` to `validators/               # zod schemas + parseOrThrow`.
6. `## The data flow`: replace the diagram with
   ```
   Server Component  ──────────────────────────────────►  usersApi.list()  ─►  api  ─►  upstream
   Client Component  ─►  useQuery(userQueries.list())  ─►  usersApi.list()  ─►  api  ─►  upstream
   ```
   Then in the bullets: change the `lib/api/users.ts` bullet to `- **\`lib/api/users.ts\`** — one typed function per operation, used by Server Components and query factories alike. It owns the upstream path, param mapping, cache tags and input validation (\`parseOrThrow\` → 422 with field messages). Components never know any of it.`; delete the `app/api/users/route.ts` bullet; in the `lib/queries/users.ts` bullet, replace the last sentence (`Server twin of this file is …`) with `Its fetchers just call \`usersApi\`.`; delete the `lib/queries/bff.ts` bullet.
7. Replace everything from `Responses use one envelope` through the closing fence of the `Try it:` curl block with:
   ````markdown
   Resource functions return the parsed payload; failures are an `ApiError`
   with a `status`, a stable `code`, and — for validation — `fields`:

   ```jsonc
   { "message": "Invalid request body", "code": "validation_error",
     "fields": { "email": ["Enter a valid email address"] } }
   ```

   Open `/dashboard` with the network panel open: user reads and creates go
   straight to `jsonplaceholder.typicode.com`, and an invalid email never
   leaves the browser.
   ````
8. `## Conventions worth keeping`: replace the `Server-only stays server-only.` bullet with `- **No secrets in the client.** \`api\` ships to the browser. A secret lives behind \`serverEnv()\` in a \`server-only\` module that no resource or Client Component imports.`; replace the `Adding a resource` bullet with `- **Adding a resource** = a schema in \`lib/validators/\`, a type in \`types/\`, \`lib/api/<resource>.ts\`, and \`lib/queries/<resource>.ts\`. Four small files, always the same shape.`; in the `Client data goes through a query factory.` bullet change `` `internalApi` directly`` to `` `api` or `usersApi` directly``.
9. `## Notes`: `` `API_BASE_URL` defaults to`` → `` `NEXT_PUBLIC_API_BASE_URL` defaults to``, and append the sentence `The upstream must allow CORS and must not need a secret — see the Direct REST caveats in \`CLAUDE.md\`.`

- [x] **Step 5: Marketing copy and templates**

`src/app/(marketing)/page.tsx`: change `A minimal Next.js boilerplate: thin routes, a typed API client behind a BFF layer,` to `A minimal Next.js boilerplate: thin routes, one typed REST client for server and browser,`.

`docs/superpowers/specs/TEMPLATE.md`:
- data-flow block:
  ```
  Server Component  ─►  <resource>Api.<op>()  ─►  api  ─►  upstream
  Client Component  ─►  useQuery(<resource>Queries.<op>())  ─►  <resource>Api.<op>()  ─►  api  ─►  upstream
  ```
- `<Any new response shape, stated against the standard envelope in` / ``\`src/types/api.ts\` — \`{ data }\` or \`{ error: { message, code, fields? } }\`.>`` → `<Any new payload shape, as the zod schema the resource function parses it` / `with. Resource functions return the payload unwrapped.>`
- `` surfaces them. Name the boundary: `ApiError` thrown in `lib/api` → serialized by`` / `` `route()` → rendered by `error.tsx` or the hook's `error` field.>`` → `` surfaces them. Name the boundary: `ApiError` thrown in `lib/api` (422 via`` / `` `parseOrThrow`) → rendered by `error.tsx` or the query's `error` field.>``

`docs/superpowers/plans/TEMPLATE.md` Global Constraints bullet:
`` `src/lib/api/client.ts` calls `fetch`; route handlers stay thin and wrapped in`` / `` `route()`; shared types are inferred from zod schemas, never hand-written.`` → `` `src/lib/api/client.ts` performs HTTP; `src/lib/api/<name>.ts` owns the upstream`` / `wire and carries no secrets; shared types are inferred from zod schemas, never hand-written.`

- [x] **Step 6: Verify no stale wording**

Run: `grep -nE "BFF|bff|internalApi|externalApi|app/api|instances\.server|API_TOKEN|(^|[^_])API_BASE_URL|NEXT_PUBLIC_APP_URL|five files|\{ data \} envelope" CLAUDE.md README.md src docs/superpowers/specs/TEMPLATE.md docs/superpowers/plans/TEMPLATE.md`
Expected: no output, exit 1

- [x] **Step 7: Mark the spec implemented**

In `docs/superpowers/specs/2026-10-02-direct-rest-design.md`, set **Status** to `` `Implemented` ``, set the **Plan** cell to `` `docs/superpowers/plans/2026-10-02-direct-rest.md` ``, and tick every Success criteria checkbox that the final verification confirmed.

- [x] **Step 8: Final verification gate**

Run: `rm -rf .next && npm run typecheck && npm run lint && npm run build && npm test`
Expected: exit 0; no `/api/*` in the route list; all suites pass

- [x] **Step 9: Commit**

```bash
git add CLAUDE.md README.md "src/app/(marketing)/page.tsx" docs/superpowers
git commit -m "docs: describe the direct REST architecture

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Decision Log

| Date | Decision | Why | Cost if wrong |
|---|---|---|---|
| 2026-10-02 | `internalApi` and `NEXT_PUBLIC_APP_URL` survive Task 2 and die in Task 3 | Keeps every commit building and green | None; temporary |
| 2026-10-02 | Resource functions are `async` | A validation failure must reject, not throw synchronously (Review Focus 5) | None |
| 2026-10-02 | The root-level `_` form test keeps mocking a rejected `post` | `createUserSchema` has no cross-field refine to trigger it for real; the form contract is still `ApiError.fields` | None |
| 2026-10-02 | `parse.ts` uses `issue.path.map(String)` | zod 4 paths are `PropertyKey[]`; `join` throws on a symbol | None |
| 2026-10-02 | Final review: suppress axios's `User-Agent` in the browser (`client.ts`) | Non-safelisted header forces a CORS preflight per GET in Firefox and fails strict CORS configs | None; server keeps its UA |
| 2026-10-02 | Final review: document build-time inlining of `NEXT_PUBLIC_API_BASE_URL` and the sanctioned `instances.server.ts` path for secrets | Silent wrong-upstream on build promotion; invariants 1 and 6 contradicted each other | None |

---

## Before marking this plan Approved

- [x] **Spec coverage**: every Components entry, deletion, copy change, test and caveat maps to Tasks 1–5. Success criteria are checked in Task 3 (Steps 8–10) and Task 5 (Steps 6–8).
- [x] **Placeholder scan**
- [x] **Type consistency**: `parseOrThrow`, `api`, `usersApi.list/byId/create` and `ListUsersParams` are used the same way in every task.
- [x] **Right-sized tasks**: five tasks, each with its own test cycle and commit.
- [x] **Status block filled**
