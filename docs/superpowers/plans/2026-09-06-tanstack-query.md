# TanStack Query Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

| | |
|---|---|
| **Status** | `Complete` |
| **Created** | 2026-09-06 |
| **Updated** | 2026-09-06 |
| **Owner** | juni |
| **Branch / worktree** | `feat/tanstack-query` — created via `superpowers:using-git-worktrees` |
| **Spec** | `docs/superpowers/specs/2026-09-06-tanstack-query-design.md` |
| **Ledger** | `.superpowers/sdd/2026-09-06-tanstack-query/progress.md` |

**Status values:** `Draft` → `Approved` → `In Progress` → `Complete`.
Off-ramps: `Blocked` (say what unblocks it in Decision Log) · `Abandoned`.

Update **Status**, **Updated**, and the Progress table as work lands. Whoever
executes this plan owns keeping it accurate — a stale plan misleads the next
session more than no plan at all.

**Goal:** Replace the hand-rolled `useAsync` primitive with TanStack Query v5 on
the client side only, behind a `queryOptions`-factory convention that every
future resource follows.

**Architecture:** TanStack Query owns Client Components; Server Components keep
awaiting `src/lib/api/*` directly and the App Router keeps owning server-side
caching. Each resource gains a browser-side module `src/lib/queries/<name>.ts`
whose keys and fetchers are declared together via `queryOptions()`, reaching the
upstream only through the existing BFF route handlers. A new `bff()` helper is
the single reader of the `{ data }` envelope, mirroring `ok()` on the write side.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript (strict) · zod ·
Tailwind v4 · TanStack Query v5 · Vitest + Testing Library

---

## Progress

| # | Task | Status | Started | Completed | Commit |
|---|---|---|---|---|---|
| 1 | Vitest + Testing Library harness | ✅ Complete | 2026-09-06 | 2026-09-06 | 594555b..ed624d5 |
| 2 | QueryClient defaults and provider | ✅ Complete | 2026-09-06 | 2026-09-06 | e45e61f |
| 3 | Propagate error envelope through the fetch wrapper | ✅ Complete | 2026-09-06 | 2026-09-06 | 338fbe9 |
| 4 | `bff()` envelope reader | ✅ Complete | 2026-09-06 | 2026-09-06 | 05a65e5 |
| 5 | `userQueries` factory | ✅ Complete | 2026-09-06 | 2026-09-06 | 85a175b |
| 6 | Convert `UserSearch`; delete `useAsync` | ✅ Complete | 2026-09-06 | 2026-09-06 | 7382ac8 |
| 7 | `userMutations.create` and `UserCreateForm` | ✅ Complete | 2026-09-06 | 2026-09-06 | e4eb70b |
| 8 | `UserDetail` and selection wiring | ✅ Complete | 2026-09-06 | 2026-09-06 | cf0b0e9 |
| 9 | Documentation | ✅ Complete | 2026-09-06 | 2026-09-06 | 173abc5 |

Legend: ⬜ Not started · 🔄 In progress · 🔁 Fix round *R*/5 · ✅ Complete · ⛔ Blocked · ⏭️ Descoped

---

## Global Constraints

Copied verbatim from the spec. Every task's requirements implicitly include this
section.

- Verification gate: `npm run typecheck && npm run lint && npm run build && npm test`
  passes with fresh output before any task is claimed complete.
- The architecture invariants in `CLAUDE.md` are binding.
- `@tanstack/react-query@^5.102.8` and `@tanstack/react-query-devtools@^5.102.8`
  as **dependencies** (devtools is imported from a Client Component that Next
  bundles at build time; the library itself no-ops in production).
- Vitest and Testing Library packages as **devDependencies**.
- React 19.2.8 / Next 16.3.4 stay as they are; no framework upgrade.
- `src/lib/queries/*` imports `internalApi` from `@/lib/api/instances`, never
  from the `@/lib/api` barrel.
- No file under `src/lib/queries/` may import `externalApi`, `usersApi`, or
  `serverEnv`.
- Route `params` and `searchParams` remain awaited Promises; the React Compiler
  lint rules are errors, not warnings.
- Docs updated in the same change: `CLAUDE.md` (invariants, the per-resource
  file list, the Layout tree, the Commands table) and `README.md` (architecture
  walkthrough, the `use-users` bullet, the data-flow description, dependencies).

**Additional execution notes:**

- Only `src/lib/api/client.test.ts` may stub global `fetch` — it is the test of
  the fetch wrapper itself. Every other test stubs at the `internalApi` seam
  with `vi.mock('@/lib/api/instances', …)`, which keeps invariant #1 honest.
- `vi.mock` is hoisted above imports. Any mock function referenced inside a
  `vi.mock` factory must be created with `vi.hoisted()`, or the factory throws
  "Cannot access before initialization".

---

## File Structure

**Create**
- `vitest.config.ts` — jsdom environment, `@/*` alias, setup file, test glob.
- `vitest.setup.ts` — registers jest-dom matchers, cleans up between tests.
- `src/test/render-with-query.tsx` — renders a Client Component against a
  throwaway `QueryClient` with retries off.
- `src/lib/queries/client.ts` — `createQueryClient()`; the only place cache and
  retry policy is set.
- `src/lib/queries/provider.tsx` — `'use client'` provider mounted in the root
  layout; owns the per-session client and the devtools.
- `src/lib/queries/bff.ts` — one browser request to a route handler: unwrap the
  `{ data }` envelope, validate the payload.
- `src/lib/queries/users.ts` — `userQueries` key hierarchy + fetchers,
  `userMutations`.
- `src/lib/queries/index.ts` — barrel, safe to import from a Client Component.
- `src/components/features/users/user-create-form.tsx` — mutation demo.
- `src/components/features/users/user-detail.tsx` — detail-query demo.

**Modify**
- `package.json` — dependencies and `test` / `test:watch` scripts.
- `src/lib/api/client.ts:75-82` — carry `code` and `fields` from an error
  envelope onto the thrown `ApiError`.
- `src/types/user.ts` — add the inferred `ListUsersParams`.
- `src/app/layout.tsx:17-21` — wrap `children` in `<QueryProvider>`.
- `src/app/dashboard/page.tsx:35-40` — render the create form and keep the
  client section's heading truthful.
- `src/components/features/users/user-search.tsx` — `useQuery`, plus selection
  state in Task 8.
- `src/components/features/users/user-list.tsx` — optional `onSelect`.
- `src/components/features/users/index.ts` — export the two new components.
- `src/lib/hooks/index.ts` — drop the deleted hooks.
- `CLAUDE.md`, `README.md` — the conventions this plan establishes.

**Delete**
- `src/lib/hooks/use-async.ts`
- `src/lib/hooks/use-users.ts`

**Test**
- `src/components/ui/spinner.test.tsx` — proves the harness itself works.
- `src/lib/queries/client.test.ts` — retry predicate and stale window.
- `src/lib/queries/provider.test.tsx` — descendants get a client.
- `src/lib/api/client.test.ts` — error envelope reaches `ApiError`.
- `src/lib/queries/bff.test.ts` — unwrapping, schema drift, verb routing.
- `src/lib/queries/users.test.ts` — key hierarchy and fetcher URLs.
- `src/components/features/users/user-search.test.tsx` — loading → data → error.
- `src/components/features/users/user-create-form.test.tsx` — invalidation and
  field messages.
- `src/components/features/users/user-detail.test.tsx` — gated query.

---

## Task 1: Vitest + Testing Library harness

**Status:** ✅ Complete · **Started:** 2026-09-06 · **Completed:** 2026-09-06

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Modify: `package.json`
- Test: `src/components/ui/spinner.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` → `vitest run`; `npm run test:watch` → `vitest`. Tests
  live beside their subject as `*.test.ts` / `*.test.tsx` under `src/`. The
  `@/*` alias resolves in tests. jest-dom matchers are globally registered.

- [x] **Step 1: Install the test stack**

```bash
npm install -D vitest@^5.0.0 @vitejs/plugin-react@^6.1.1 jsdom@^30.0.1 \
  @testing-library/react@^16.3.3 @testing-library/jest-dom@^7.0.1 \
  @testing-library/user-event@^14.6.7
```

- [x] **Step 2: Write the failing test**

This tests real existing code, not a throwaway — `toHaveAccessibleName` only
resolves if jest-dom registered, and `@/components/...` only resolves if the
alias is wired.

```tsx
// src/components/ui/spinner.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from '@/components/ui/spinner';

describe('Spinner', () => {
  it('exposes a loading status to assistive tech', () => {
    render(<Spinner />);

    expect(screen.getByRole('status')).toHaveAccessibleName('Loading');
  });
});
```

- [x] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/ui/spinner.test.tsx`
Expected: FAIL — the `@/components/ui/spinner` import cannot be resolved (no
alias configured yet). If the alias somehow resolves, it still fails on
`document is not defined`, because the default environment is `node`.

- [x] **Step 4: Write the Vitest config**

```ts
// vitest.config.ts
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
```

- [x] **Step 5: Write the setup file**

```ts
// vitest.setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

- [x] **Step 6: Add the scripts**

In `package.json`, add to `"scripts"`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [x] **Step 7: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 1 passed (1 test file).

- [x] **Step 8: Verify the repo is clean**

Run: `npm run typecheck && npm run lint`
Expected: exit 0, no eslint output. `vitest.config.ts` and `vitest.setup.ts` are
picked up by the existing tsconfig `include` glob, so no tsconfig change is
needed — if typecheck complains about them, that is a real error to fix, not a
config gap to paper over.

- [x] **Step 9: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts src/components/ui/spinner.test.tsx
git commit -m "chore: add Vitest and Testing Library harness"
```

---

## Task 2: QueryClient defaults and provider

**Status:** ✅ Complete · **Started:** 2026-09-06 · **Completed:** 2026-09-06

**Files:**
- Create: `src/lib/queries/client.ts`, `src/lib/queries/provider.tsx`, `src/lib/queries/index.ts`
- Modify: `package.json`, `src/app/layout.tsx`
- Test: `src/lib/queries/client.test.ts`, `src/lib/queries/provider.test.tsx`

**Interfaces:**
- Consumes: `ApiError` from `@/lib/api/errors` (has a numeric `status`).
- Produces:
  - `createQueryClient(): QueryClient` — defaults: `staleTime: 60_000`,
    `gcTime: 300_000`, `refetchOnWindowFocus: false`, a retry predicate
    `(failureCount: number, error: Error) => boolean`, and `mutations: { retry: false }`.
  - `QueryProvider({ children }: { children: React.ReactNode })` — a
    `'use client'` component.
  - Barrel `@/lib/queries` re-exports both.

- [x] **Step 1: Install TanStack Query**

```bash
npm install @tanstack/react-query@^5.102.8 @tanstack/react-query-devtools@^5.102.8
```

- [x] **Step 2: Write the failing test for the defaults**

```ts
// src/lib/queries/client.test.ts
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
```

- [x] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/queries/client.test.ts`
Expected: FAIL — `Cannot find module './client'`.

- [x] **Step 4: Write the client factory**

```ts
// src/lib/queries/client.ts
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
```

- [x] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/queries/client.test.ts`
Expected: PASS — 3 passed.

- [x] **Step 6: Write the failing test for the provider**

```tsx
// src/lib/queries/provider.test.tsx
import { useQuery } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QueryProvider } from './provider';

function Probe() {
  const { data } = useQuery({
    queryKey: ['probe'],
    queryFn: () => Promise.resolve('ready'),
  });

  return <p>{data ?? 'pending'}</p>;
}

describe('QueryProvider', () => {
  it('supplies a QueryClient to its descendants', async () => {
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );

    expect(await screen.findByText('ready')).toBeInTheDocument();
  });
});
```

- [x] **Step 7: Run the test to verify it fails**

Run: `npx vitest run src/lib/queries/provider.test.tsx`
Expected: FAIL — `Cannot find module './provider'`.

- [x] **Step 8: Write the provider**

```tsx
// src/lib/queries/provider.tsx
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { createQueryClient } from './client';

/**
 * One QueryClient per browser session, created lazily inside `useState` so it
 * is never a module-level singleton — that would share cache across requests
 * during SSR. Devtools render nothing in production builds.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

- [x] **Step 9: Write the barrel**

```ts
// src/lib/queries/index.ts
export { createQueryClient } from './client';
export { QueryProvider } from './provider';
```

- [x] **Step 10: Run the test to verify it passes**

Run: `npx vitest run src/lib/queries/provider.test.tsx`
Expected: PASS — 1 passed.

- [x] **Step 11: Mount the provider in the root layout**

In `src/app/layout.tsx`, add the import and wrap `{children}`:

```tsx
import { QueryProvider } from '@/lib/queries';
```

```tsx
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100`}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
```

- [x] **Step 12: Verify the whole gate**

Run: `npm run typecheck && npm run lint && npm run build && npm test`
Expected: all exit 0. The build must still prerender `/` and `/dashboard` —
a `'use client'` provider in the root layout does not opt the tree out of SSR.

- [x] **Step 13: Commit**

```bash
git add package.json package-lock.json src/lib/queries src/app/layout.tsx
git commit -m "feat: add TanStack Query client defaults and provider"
```

---

## Task 3: Propagate error envelope through the fetch wrapper

**Status:** ✅ Complete · **Started:** 2026-09-06 · **Completed:** 2026-09-06

Today `src/lib/api/client.ts` throws away `code` and `fields` from a failed
response: it reads only the message and re-derives the code from the status. So
`ApiError.fields` is always `undefined` in the browser, and the 422 field
messages the BFF already produces never reach a form. Task 7 depends on this.

**Files:**
- Modify: `src/lib/api/client.ts` (the `if (!response.ok)` branch, lines 75-82;
  add two module-level helpers beside `extractMessage`)
- Test: `src/lib/api/client.test.ts`

**Interfaces:**
- Consumes: `ApiErrorBody` from `@/types/api` — `{ message: string; code: string; fields?: Record<string, string[]> }`.
- Produces: on a non-2xx whose body matches the app's error envelope, the thrown
  `ApiError` carries that envelope's `code` and `fields`. Nothing else changes:
  a non-envelope body still yields the status-derived code.

- [x] **Step 1: Write the failing test**

This is the one test allowed to stub global `fetch` — it is the test of the
fetch wrapper itself.

```ts
// src/lib/api/client.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';
import { ApiError } from './errors';

const client = createApiClient({ baseUrl: 'https://example.test' });

function respondWith(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createApiClient error handling', () => {
  it('carries code and fields from an error envelope onto the ApiError', async () => {
    respondWith(422, {
      error: {
        message: 'Invalid request body',
        code: 'validation_error',
        fields: { email: ['Enter a valid email address'] },
      },
    });

    const error = await client.get('/users').catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'validation_error',
      message: 'Invalid request body',
      fields: { email: ['Enter a valid email address'] },
    });
  });

  it('falls back to a status-derived code when the body is not an envelope', async () => {
    respondWith(500, 'boom');

    const error = await client.get('/users').catch((cause: unknown) => cause);

    expect(error).toMatchObject({ status: 500, code: 'internal_error', message: 'boom' });
    expect((error as ApiError).fields).toBeUndefined();
  });

  it('ignores a malformed error key rather than trusting it', async () => {
    respondWith(400, { error: { message: 'nope' } });

    const error = await client.get('/users').catch((cause: unknown) => cause);

    expect(error).toMatchObject({ status: 400, code: 'bad_request', message: 'nope' });
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/api/client.test.ts`
Expected: FAIL — exactly one of the three, on `fields` being `undefined`. The
other two already pass: `codeForStatus()` happens to derive `'validation_error'`
from 422 and `'bad_request'` from 400, so only the field messages are actually
missing today. Confirm the failure names `fields`.

- [x] **Step 3: Add the envelope reader to `client.ts`**

Add the `ApiErrorBody` type import at the top of `src/lib/api/client.ts`:

```ts
import type { ApiErrorBody } from '@/types/api';
```

Add these two helpers beside `extractMessage` at the bottom of the file:

```ts
/**
 * Reads this app's own error envelope (`src/types/api.ts`) off a failed
 * response, so `code` and field messages survive the trip to the browser.
 * Anything that does not match the envelope exactly is ignored.
 */
function errorEnvelope(payload: unknown): ApiErrorBody | undefined {
  if (!payload || typeof payload !== 'object') return undefined;

  const candidate = (payload as { error?: unknown }).error;
  if (!candidate || typeof candidate !== 'object') return undefined;

  const { message, code, fields } = candidate as Record<string, unknown>;
  if (typeof message !== 'string' || typeof code !== 'string') return undefined;

  return { message, code, ...(isFieldMap(fields) && { fields }) };
}

function isFieldMap(value: unknown): value is Record<string, string[]> {
  return (
    !!value &&
    typeof value === 'object' &&
    Object.values(value).every(
      (entry) => Array.isArray(entry) && entry.every((item) => typeof item === 'string'),
    )
  );
}
```

- [x] **Step 4: Use it in the non-2xx branch**

Replace the existing `if (!response.ok) { … }` block with:

```ts
    if (!response.ok) {
      const envelope = errorEnvelope(payload);

      throw new ApiError({
        message:
          envelope?.message ??
          extractMessage(payload) ??
          `${method} ${path} failed with ${response.status}`,
        status: response.status,
        code: envelope?.code,
        fields: envelope?.fields,
        url,
      });
    }
```

- [x] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/api/client.test.ts`
Expected: PASS — 3 passed.

- [x] **Step 6: Verify nothing else regressed**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all exit 0.

- [x] **Step 7: Commit**

```bash
git add src/lib/api/client.ts src/lib/api/client.test.ts
git commit -m "fix: carry error envelope code and fields onto ApiError"
```

---

## Task 4: `bff()` envelope reader

**Status:** ✅ Complete · **Started:** 2026-09-06 · **Completed:** 2026-09-06

**Files:**
- Create: `src/lib/queries/bff.ts`
- Modify: `src/lib/queries/index.ts`
- Test: `src/lib/queries/bff.test.ts`

**Interfaces:**
- Consumes: `internalApi` from `@/lib/api/instances` (methods `get`/`post`/`put`/`patch`/`delete`,
  each `<T>(path: string, options?: { params?; body?; schema?; timeoutMs?; next? }) => Promise<T>`);
  `ApiError` from `@/lib/api/errors`; `ApiResponse<T>` from `@/types/api`.
- Produces:
  ```ts
  export interface BffOptions<T> {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; // default 'GET'
    params?: Record<string, string | number | boolean | null | undefined>;
    body?: unknown;
    schema: ZodType<T>;
  }
  export function bff<T>(path: string, options: BffOptions<T>): Promise<T>;
  ```
  Always calls the underlying client with exactly `{ params, body }` — never a
  `schema`, because the client's own `schema` option would validate the
  envelope, not the payload.

- [x] **Step 1: Write the failing test**

```ts
// src/lib/queries/bff.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/lib/api/instances', () => ({
  internalApi: { get, post, put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { bff } from './bff';

const schema = z.object({ id: z.number() });

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('bff', () => {
  it('unwraps the data envelope and validates the payload', async () => {
    get.mockResolvedValue({ data: { id: 7 } });

    await expect(bff('/api/things/7', { schema })).resolves.toEqual({ id: 7 });
    expect(get).toHaveBeenCalledWith('/api/things/7', { params: undefined, body: undefined });
  });

  it('throws 502 invalid_response when the payload does not match its schema', async () => {
    get.mockResolvedValue({ data: { id: 'seven' } });

    const error = await bff('/api/things/7', { schema }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: 'invalid_response' });
  });

  it('throws 502 invalid_response when the envelope carries no data key', async () => {
    get.mockResolvedValue({});

    const error = await bff('/api/things/7', { schema }).catch((cause: unknown) => cause);

    expect(error).toMatchObject({ status: 502, code: 'invalid_response' });
  });

  it('routes a POST through internalApi.post with the body', async () => {
    post.mockResolvedValue({ data: { id: 8 } });

    await expect(
      bff('/api/things', { method: 'POST', body: { id: 8 }, schema }),
    ).resolves.toEqual({ id: 8 });
    expect(post).toHaveBeenCalledWith('/api/things', { params: undefined, body: { id: 8 } });
  });

  it('lets an ApiError from the client through untouched', async () => {
    get.mockRejectedValue(
      new ApiError({ message: 'Invalid request body', status: 422, code: 'validation_error' }),
    );

    const error = await bff('/api/things', { schema }).catch((cause: unknown) => cause);

    expect(error).toMatchObject({ status: 422, code: 'validation_error' });
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/queries/bff.test.ts`
Expected: FAIL — `Cannot find module './bff'`.

- [x] **Step 3: Write the implementation**

```ts
// src/lib/queries/bff.ts
import type { ZodType } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { internalApi } from '@/lib/api/instances';
import type { ApiResponse } from '@/types/api';

export interface BffOptions<T> {
  /** Defaults to GET. */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  /** Validates the payload *inside* the envelope, not the envelope itself. */
  schema: ZodType<T>;
}

interface SendOptions {
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
}

/**
 * The browser's one door to a route handler, and the read-side mirror of `ok()`
 * in `src/lib/utils/http.ts`: `ok()` writes the `{ data }` envelope, `bff()`
 * reads it. Non-2xx responses already became an `ApiError` inside
 * `src/lib/api/client.ts`, so the only failure added here is a payload that
 * does not match its schema.
 */
export async function bff<T>(path: string, options: BffOptions<T>): Promise<T> {
  const { method = 'GET', params, body, schema } = options;
  const envelope = await send(method, path, { params, body });

  if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) {
    throw new ApiError({
      message: `Malformed response from ${path}`,
      status: 502,
      code: 'invalid_response',
    });
  }

  const parsed = schema.safeParse(envelope.data);
  if (!parsed.success) {
    throw new ApiError({
      message: `Unexpected payload from ${path}`,
      status: 502,
      code: 'invalid_response',
      cause: parsed.error,
    });
  }

  return parsed.data;
}

/**
 * Spelled out per verb rather than indexed by method name: the explicit switch
 * keeps the generic call sites type-checked instead of relying on an indexed
 * union of call signatures.
 */
function send(
  method: NonNullable<BffOptions<unknown>['method']>,
  path: string,
  options: SendOptions,
): Promise<ApiResponse<unknown>> {
  switch (method) {
    case 'POST':
      return internalApi.post<ApiResponse<unknown>>(path, options);
    case 'PUT':
      return internalApi.put<ApiResponse<unknown>>(path, options);
    case 'PATCH':
      return internalApi.patch<ApiResponse<unknown>>(path, options);
    case 'DELETE':
      return internalApi.delete<ApiResponse<unknown>>(path, options);
    default:
      return internalApi.get<ApiResponse<unknown>>(path, options);
  }
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/queries/bff.test.ts`
Expected: PASS — 5 passed.

- [x] **Step 5: Export it from the barrel**

`src/lib/queries/index.ts` becomes:

```ts
export { bff } from './bff';
export type { BffOptions } from './bff';
export { createQueryClient } from './client';
export { QueryProvider } from './provider';
```

- [x] **Step 6: Verify the repo is clean**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all exit 0.

- [x] **Step 7: Commit**

```bash
git add src/lib/queries/bff.ts src/lib/queries/bff.test.ts src/lib/queries/index.ts
git commit -m "feat: add bff() envelope reader for browser-side reads"
```

---

## Task 5: `userQueries` factory

**Status:** ✅ Complete · **Started:** 2026-09-06 · **Completed:** 2026-09-06

**Files:**
- Create: `src/lib/queries/users.ts`
- Modify: `src/types/user.ts`, `src/lib/queries/index.ts`
- Test: `src/lib/queries/users.test.ts`

**Interfaces:**
- Consumes: `bff` from `./bff`; `userSchema` / `userListSchema` from
  `@/lib/validators/user`; `listUsersQuerySchema` (via the inferred
  `ListUsersParams`) and `ListUsersParams` from `@/types/user`.
- Produces:
  ```ts
  // src/types/user.ts
  export type ListUsersParams = Partial<z.infer<typeof listUsersQuerySchema>>;
  // → { page?: number; pageSize?: number }

  // src/lib/queries/users.ts
  export const userQueries: {
    all():     readonly ['users'];
    lists():   readonly ['users', 'list'];
    list(params?: ListUsersParams): ReturnType<typeof queryOptions<User[]>>;
    details(): readonly ['users', 'detail'];
    detail(id: number): ReturnType<typeof queryOptions<User>>;
  };
  ```

- [x] **Step 1: Add the inferred params type**

`src/types/user.ts` becomes:

```ts
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
```

- [x] **Step 2: Write the failing test**

```ts
// src/lib/queries/users.test.ts
import { QueryClient, hashKey } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/api/instances', () => ({
  internalApi: { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { userQueries } from './users';

const ada = { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' };

beforeEach(() => {
  get.mockReset();
});

describe('userQueries keys', () => {
  it('nests every key under the resource root', () => {
    expect(userQueries.list().queryKey.slice(0, 1)).toEqual(['users']);
    expect(userQueries.detail(1).queryKey.slice(0, 1)).toEqual(['users']);
  });

  it('separates lists from details', () => {
    expect(hashKey(userQueries.list().queryKey)).not.toBe(
      hashKey(userQueries.detail(1).queryKey),
    );
  });

  it('gives different params different keys', () => {
    expect(hashKey(userQueries.list({ page: 1 }).queryKey)).not.toBe(
      hashKey(userQueries.list({ page: 2 }).queryKey),
    );
  });

  it('is insensitive to param key order', () => {
    expect(hashKey(userQueries.list({ page: 1, pageSize: 10 }).queryKey)).toBe(
      hashKey(userQueries.list({ pageSize: 10, page: 1 }).queryKey),
    );
  });
});

describe('userQueries fetchers', () => {
  it('reads the list through /api/users with its params', async () => {
    get.mockResolvedValue({ data: [ada] });

    await expect(
      new QueryClient().fetchQuery(userQueries.list({ pageSize: 1 })),
    ).resolves.toEqual([ada]);
    expect(get).toHaveBeenCalledWith('/api/users', {
      params: { pageSize: 1 },
      body: undefined,
    });
  });

  it('reads one user through /api/users/:id', async () => {
    get.mockResolvedValue({ data: ada });

    await expect(new QueryClient().fetchQuery(userQueries.detail(1))).resolves.toEqual(ada);
    expect(get).toHaveBeenCalledWith('/api/users/1', { params: undefined, body: undefined });
  });
});
```

- [x] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/queries/users.test.ts`
Expected: FAIL — `Cannot find module './users'`.

- [x] **Step 4: Write the factory**

```ts
// src/lib/queries/users.ts
import { queryOptions } from '@tanstack/react-query';
import { userListSchema, userSchema } from '@/lib/validators/user';
import type { ListUsersParams } from '@/types/user';
import { bff } from './bff';

/**
 * Browser-side reads for the `users` resource.
 *
 * Three rules hold for every resource in this app:
 *   1. The key mirrors the URL — ['users', 'list', params] ↔ /api/users?…
 *      Params are always one object; TanStack hashes it order-independently.
 *   2. Key and fetcher are declared together, so a key cannot drift from the
 *      function that fills it.
 *   3. Invalidating `all()` reaches lists and details alike.
 *
 * The server-side twin of this file is `src/lib/api/users.ts`, which talks to
 * the upstream. This one only ever talks to our own route handlers.
 */
export const userQueries = {
  all: () => ['users'] as const,

  lists: () => [...userQueries.all(), 'list'] as const,

  list: (params: ListUsersParams = {}) =>
    queryOptions({
      queryKey: [...userQueries.lists(), params] as const,
      queryFn: () => bff('/api/users', { params, schema: userListSchema }),
    }),

  details: () => [...userQueries.all(), 'detail'] as const,

  detail: (id: number) =>
    queryOptions({
      queryKey: [...userQueries.details(), id] as const,
      queryFn: () => bff(`/api/users/${id}`, { schema: userSchema }),
    }),
};
```

- [x] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/queries/users.test.ts`
Expected: PASS — 6 passed.

- [x] **Step 6: Export it from the barrel**

Add to `src/lib/queries/index.ts`:

```ts
export { userQueries } from './users';
```

- [x] **Step 7: Verify the repo is clean**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all exit 0.

- [x] **Step 8: Commit**

```bash
git add src/lib/queries/users.ts src/lib/queries/users.test.ts src/lib/queries/index.ts src/types/user.ts
git commit -m "feat: add userQueries factory with a keyed hierarchy"
```

---

## Task 6: Convert `UserSearch`; delete `useAsync`

**Status:** ✅ Complete · **Started:** 2026-09-06 · **Completed:** 2026-09-06

**Files:**
- Create: `src/test/render-with-query.tsx`
- Modify: `src/components/features/users/user-search.tsx`, `src/lib/hooks/index.ts`
- Delete: `src/lib/hooks/use-async.ts`, `src/lib/hooks/use-users.ts`
- Test: `src/components/features/users/user-search.test.tsx`

**Interfaces:**
- Consumes: `userQueries.list(params)` from `@/lib/queries/users`; `useDebounce`
  from `@/lib/hooks/use-debounce` (unchanged).
- Produces:
  - `renderWithQuery(ui: ReactElement): { queryClient: QueryClient } & RenderResult`
    — used by Tasks 7 and 8.
  - `UserSearch` keeps its zero-prop signature; `useAsync` and `useUsers` no
    longer exist anywhere in the repo.

- [x] **Step 1: Write the render helper**

```tsx
// src/test/render-with-query.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

/**
 * Renders a Client Component against a throwaway QueryClient. Retries are off
 * so a rejected query surfaces immediately instead of after the app's backoff.
 */
export function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper }) };
}
```

- [x] **Step 2: Write the failing test**

```tsx
// src/components/features/users/user-search.test.tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/api/instances', () => ({
  internalApi: { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { ApiError } from '@/lib/api/errors';
import { renderWithQuery } from '@/test/render-with-query';
import { UserSearch } from './user-search';

const users = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 2, name: 'Grace Hopper', email: 'grace@example.com' },
];

beforeEach(() => {
  get.mockReset();
});

describe('UserSearch', () => {
  it('shows the loading state, then the list', async () => {
    get.mockResolvedValue({ data: users });

    renderWithQuery(<UserSearch />);

    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('surfaces an ApiError as an alert', async () => {
    get.mockRejectedValue(new ApiError({ message: 'Upstream is down', status: 503 }));

    renderWithQuery(<UserSearch />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Upstream is down');
  });

  it('filters the rendered list by the debounced query', async () => {
    get.mockResolvedValue({ data: users });
    const user = userEvent.setup();

    renderWithQuery(<UserSearch />);
    await screen.findByText('Ada Lovelace');

    await user.type(screen.getByLabelText('Search users'), 'grace');

    await waitFor(() => {
      expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
  });

  it('dedupes the read across two consumers sharing a client', async () => {
    get.mockResolvedValue({ data: users });

    renderWithQuery(
      <>
        <UserSearch />
        <UserSearch />
      </>,
    );
    await screen.findAllByText('Ada Lovelace');

    expect(get).toHaveBeenCalledTimes(1);
  });
});
```

- [x] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/features/users/user-search.test.tsx`
Expected: FAIL — 1 failed, 3 passed. The first three cases describe the visible
contract, which this conversion deliberately preserves, so they pass against the
old `useAsync` implementation. The dedupe case is the discriminating one: it
fails with "expected 1, received 2", because `useAsync` has no shared cache and
each mounted consumer issues its own request. That single failure is the red in
this red-green cycle — if it passes before Step 4, something is wrong with the
mock, not with the component.

- [x] **Step 4: Convert the component**

`src/components/features/users/user-search.tsx` becomes:

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { userQueries } from '@/lib/queries/users';
import { UserList } from './user-list';

/**
 * Client-side counterpart to the server-rendered list: reads through the BFF
 * with TanStack Query, filters locally. Shows the loading/error/empty triad.
 */
export function UserSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query);
  const { data, error, isPending, isFetching, refetch } = useQuery(
    userQueries.list({ pageSize: 10 }),
  );

  const filtered = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    if (!needle) return data ?? [];

    return (data ?? []).filter(
      (user) =>
        user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle),
    );
  }, [data, debouncedQuery]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search users…"
          aria-label="Search users"
        />
        <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Spinner /> : 'Refresh'}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      ) : isPending ? (
        <p className="flex items-center gap-2 text-sm text-neutral-500">
          <Spinner /> Loading users…
        </p>
      ) : (
        <UserList users={filtered} />
      )}
    </div>
  );
}
```

- [x] **Step 5: Delete the old primitives**

```bash
git rm src/lib/hooks/use-async.ts src/lib/hooks/use-users.ts
```

`src/lib/hooks/index.ts` becomes:

```ts
export * from './use-debounce';
```

- [x] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/components/features/users/user-search.test.tsx`
Expected: PASS — 4 passed.

- [x] **Step 7: Prove the old primitives are gone**

Run: `grep -rn "useAsync\|useUsers\|use-async\|use-users" src README.md CLAUDE.md`
Expected: matches only in `README.md` and `CLAUDE.md` (fixed in Task 9), nothing
under `src`. If anything under `src` matches, fix it before committing.

- [x] **Step 8: Verify the whole gate**

Run: `npm run typecheck && npm run lint && npm run build && npm test`
Expected: all exit 0.

- [x] **Step 9: Commit**

```bash
git add -A src/components/features/users src/lib/hooks src/test
git commit -m "refactor: read users through TanStack Query, drop useAsync"
```

---

## Task 7: `userMutations.create` and `UserCreateForm`

**Status:** ✅ Complete · **Started:** 2026-09-06 · **Completed:** 2026-09-06

**Files:**
- Create: `src/components/features/users/user-create-form.tsx`
- Modify: `src/lib/queries/users.ts`, `src/lib/queries/index.ts`,
  `src/components/features/users/index.ts`, `src/app/dashboard/page.tsx`
- Test: `src/components/features/users/user-create-form.test.tsx`

**Interfaces:**
- Consumes: `bff`, `userQueries.all()`, `userSchema`, `CreateUserInput`,
  `ApiError.fields` (which reaches the browser as of Task 3).
- Produces:
  ```ts
  export const userMutations: {
    create(queryClient: QueryClient): {
      mutationFn: (input: CreateUserInput) => Promise<User>;
      onSuccess: () => Promise<void>;
    };
  };
  export function UserCreateForm(): JSX.Element;
  ```
  The factory owns invalidation. Call sites that also need to react to success
  pass their own `onSuccess` to `mutate()`, which composes with the factory's
  rather than replacing it.

- [x] **Step 1: Write the failing test**

```tsx
// src/components/features/users/user-create-form.test.tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/lib/api/instances', () => ({
  internalApi: { get, post, put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { ApiError } from '@/lib/api/errors';
import { renderWithQuery } from '@/test/render-with-query';
import { UserCreateForm } from './user-create-form';
import { UserSearch } from './user-search';

const ada = { id: 11, name: 'Ada Lovelace', email: 'ada@example.com' };

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('UserCreateForm', () => {
  it('refetches the list after a successful create', async () => {
    get.mockResolvedValue({ data: [] });
    post.mockResolvedValue({ data: ada });
    const user = userEvent.setup();

    renderWithQuery(
      <>
        <UserSearch />
        <UserCreateForm />
      </>,
    );
    await screen.findByText('No users found.');
    expect(get).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    get.mockResolvedValue({ data: [ada] });
    await user.click(screen.getByRole('button', { name: 'Add user' }));

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    await waitFor(() => {
      expect(get).toHaveBeenCalledTimes(2);
    });
    expect(post).toHaveBeenCalledWith('/api/users', {
      params: undefined,
      body: { name: 'Ada Lovelace', email: 'ada@example.com' },
    });
  });

  it('clears the inputs once the create succeeds', async () => {
    get.mockResolvedValue({ data: [] });
    post.mockResolvedValue({ data: ada });
    const user = userEvent.setup();

    renderWithQuery(<UserCreateForm />);
    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Add user' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toHaveValue('');
    });
    expect(screen.getByLabelText('Email')).toHaveValue('');
  });

  it('renders field messages from a 422', async () => {
    post.mockRejectedValue(
      new ApiError({
        message: 'Invalid request body',
        status: 422,
        code: 'validation_error',
        fields: { email: ['Enter a valid email address'] },
      }),
    );
    const user = userEvent.setup();

    renderWithQuery(<UserCreateForm />);
    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Add user' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/features/users/user-create-form.test.tsx`
Expected: FAIL — `Cannot find module './user-create-form'`.

- [x] **Step 3: Add the mutation factory**

Extend `src/lib/queries/users.ts`. Update the import line and append the export:

```ts
import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query';
import type { CreateUserInput, ListUsersParams } from '@/types/user';
```

```ts
/**
 * Mutations take the QueryClient and own their own invalidation, so forgetting
 * to invalidate means deliberately not using the factory. Invalidating `all()`
 * reaches both the lists and any cached detail.
 */
export const userMutations = {
  create: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: (input: CreateUserInput) =>
        bff('/api/users', { method: 'POST', body: input, schema: userSchema }),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: userQueries.all() }),
    }),
};
```

- [x] **Step 4: Write the form**

```tsx
// src/components/features/users/user-create-form.tsx
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api/errors';
import { userMutations } from '@/lib/queries/users';

/**
 * Mutation demo. The new row appears because the mutation invalidates the
 * users cache — never because this component pushed data into a list.
 */
export function UserCreateForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation(userMutations.create(queryClient));

  // Field messages come from the BFF's 422 envelope, carried by ApiError.
  const fields = error instanceof ApiError ? error.fields : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // A mutate-level onSuccess composes with the factory's; it does not replace it.
    mutate(
      { name, email },
      {
        onSuccess: () => {
          setName('');
          setEmail('');
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            aria-label="Name"
            aria-invalid={fields?.name ? true : undefined}
          />
          {fields?.name?.map((message) => (
            <p key={message} className="text-xs text-red-600">
              {message}
            </p>
          ))}
        </div>

        <div className="space-y-1">
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            aria-label="Email"
            aria-invalid={fields?.email ? true : undefined}
          />
          {fields?.email?.map((message) => (
            <p key={message} className="text-xs text-red-600">
              {message}
            </p>
          ))}
        </div>
      </div>

      {error && !fields ? (
        <p className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? <Spinner /> : 'Add user'}
      </Button>
    </form>
  );
}
```

- [x] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/features/users/user-create-form.test.tsx`
Expected: PASS — 3 passed.

- [x] **Step 6: Export and mount it**

Add to `src/components/features/users/index.ts`:

```ts
export * from './user-create-form';
```

Add to `src/lib/queries/index.ts`:

```ts
export { userMutations, userQueries } from './users';
```

(replacing the `export { userQueries } from './users';` line added in Task 5).

In `src/app/dashboard/page.tsx`, import the form and render it inside the
client-hook section, above `<UserSearch />`:

```tsx
import { UserCreateForm } from '@/components/features/users/user-create-form';
```

```tsx
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Client · TanStack Query → /api/users
        </h2>
        <UserCreateForm />
        <UserSearch />
      </section>
```

- [x] **Step 7: Verify the whole gate**

Run: `npm run typecheck && npm run lint && npm run build && npm test`
Expected: all exit 0.

- [x] **Step 8: Commit**

```bash
git add src/lib/queries src/components/features/users src/app/dashboard/page.tsx
git commit -m "feat: add create-user mutation with cache invalidation"
```

---

## Task 8: `UserDetail` and selection wiring

**Status:** ✅ Complete · **Started:** 2026-09-06 · **Completed:** 2026-09-06

**Files:**
- Create: `src/components/features/users/user-detail.tsx`
- Modify: `src/components/features/users/user-list.tsx`,
  `src/components/features/users/user-search.tsx`,
  `src/components/features/users/index.ts`
- Test: `src/components/features/users/user-detail.test.tsx`

**Interfaces:**
- Consumes: `userQueries.detail(id)`.
- Produces:
  - `UserDetail({ userId }: { userId: number | null })` — renders `null` while
    `userId` is `null`, so the detail query never runs unasked.
  - `UserList({ users, onSelect }: { users: User[]; onSelect?: (user: User) => void })`
    — unchanged rendering when `onSelect` is omitted, which is how the Server
    Component keeps using it.

- [x] **Step 1: Write the failing test**

```tsx
// src/components/features/users/user-detail.test.tsx
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/api/instances', () => ({
  internalApi: { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { ApiError } from '@/lib/api/errors';
import { renderWithQuery } from '@/test/render-with-query';
import { UserDetail } from './user-detail';

const grace = { id: 3, name: 'Grace Hopper', email: 'grace@example.com' };

beforeEach(() => {
  get.mockReset();
});

describe('UserDetail', () => {
  it('does not query while no user is selected', () => {
    renderWithQuery(<UserDetail userId={null} />);

    expect(get).not.toHaveBeenCalled();
  });

  it('fetches and renders the selected user', async () => {
    get.mockResolvedValue({ data: grace });

    renderWithQuery(<UserDetail userId={3} />);

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/api/users/3', { params: undefined, body: undefined });
  });

  it('surfaces a 404 as an alert', async () => {
    get.mockRejectedValue(new ApiError({ message: 'User not found', status: 404 }));

    renderWithQuery(<UserDetail userId={99} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('User not found');
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/features/users/user-detail.test.tsx`
Expected: FAIL — `Cannot find module './user-detail'`.

- [x] **Step 3: Write the component**

The `null` guard lives in the exported component and the query in a private
child, so the hook is never called conditionally and no placeholder id is ever
hashed into a cache key.

```tsx
// src/components/features/users/user-detail.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { userQueries } from '@/lib/queries/users';

/** Renders nothing until a user is selected, so the detail query never runs unasked. */
export function UserDetail({ userId }: { userId: number | null }) {
  if (userId === null) return null;

  return <UserDetailPanel userId={userId} />;
}

function UserDetailPanel({ userId }: { userId: number }) {
  const { data, error, isPending, isError } = useQuery(userQueries.detail(userId));

  if (isPending) return <Spinner />;

  if (isError) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {error.message}
      </p>
    );
  }

  return (
    <Card>
      <CardTitle>{data.name}</CardTitle>
      <CardDescription>{data.email}</CardDescription>
      <CardDescription>User #{data.id}</CardDescription>
    </Card>
  );
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/features/users/user-detail.test.tsx`
Expected: PASS — 3 passed.

- [x] **Step 5: Make list rows selectable**

`src/components/features/users/user-list.tsx` becomes:

```tsx
import type { User } from '@/types/user';
import { UserCard } from './user-card';

/**
 * Presentational. `onSelect` is optional so a Server Component can keep
 * rendering this list without passing a function across the boundary.
 */
export function UserList({
  users,
  onSelect,
}: {
  users: User[];
  onSelect?: (user: User) => void;
}) {
  if (users.length === 0) {
    return <p className="text-sm text-neutral-500">No users found.</p>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {users.map((user) => (
        <li key={user.id}>
          {onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(user)}
              className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              <UserCard user={user} />
            </button>
          ) : (
            <UserCard user={user} />
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [x] **Step 6: Wire selection into `UserSearch`**

In `src/components/features/users/user-search.tsx`, add the import, the state,
and the two render changes:

```tsx
import { UserDetail } from './user-detail';
```

```tsx
  const [selectedId, setSelectedId] = useState<number | null>(null);
```

```tsx
        <UserList users={filtered} onSelect={(user) => setSelectedId(user.id)} />
```

and render the panel as the last child of the outer `<div className="space-y-4">`:

```tsx
      <UserDetail userId={selectedId} />
```

- [x] **Step 7: Export the component**

Add to `src/components/features/users/index.ts`:

```ts
export * from './user-detail';
```

- [x] **Step 8: Verify the whole gate**

Run: `npm run typecheck && npm run lint && npm run build && npm test`
Expected: all exit 0. The `user-search.test.tsx` cases from Task 6 must still
pass — `findByText('Ada Lovelace')` still matches inside the new button.

- [x] **Step 9: Commit**

```bash
git add src/components/features/users
git commit -m "feat: add user detail query driven by list selection"
```

---

## Task 9: Documentation

**Status:** ✅ Complete · **Started:** 2026-09-06 · **Completed:** 2026-09-06

No test — the deliverable is prose. Verification is the grep checks in Step 4
plus the full gate.

**Files:**
- Modify: `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: everything Tasks 1-8 produced.
- Produces: docs that describe the query layer, with no surviving reference to
  `useAsync`, `useUsers`, or "no test runner".

- [x] **Step 1: Update `CLAUDE.md`**

In the **Commands** table, add a row after `Typecheck`:

```
| Test | `npm test` | Vitest + Testing Library, jsdom; `npm run test:watch` to iterate |
```

Replace the **Verification gate** paragraph with:

```
**Verification gate.** Per `superpowers:verification-before-completion`, no
completion claim without fresh output from `npm run typecheck && npm run lint &&
npm run build && npm test` in the *current* message.
```

Add an eighth architecture invariant:

```
8. **Client reads go through a query factory.** Client Components never call
   `internalApi` directly. They use `useQuery(<name>Queries.<op>())` from
   `src/lib/queries/<name>.ts`, where the key and the fetcher are declared
   together in one `queryOptions()` call. Mutation factories take the
   `QueryClient` and own their own invalidation.
```

Replace the **Adding a resource** block with (note the heading now says five):

~~~markdown
### Adding a resource — always these five files

```
src/lib/validators/<name>.ts     zod schemas (+ query/body schemas)
src/types/<name>.ts              z.infer types, re-exported from types/index.ts
src/lib/api/<name>.ts            SERVER: typed functions per operation, cache tags
src/app/api/<name>/route.ts      BFF handler
src/lib/queries/<name>.ts        BROWSER: query keys + queryOptions/mutationOptions
```

`lib/api/<name>.ts` is server-only — it imports `externalApi`, which carries
`API_TOKEN`. `lib/queries/<name>.ts` is its browser twin and reaches the same
data through the route handler. Never import one from the other.
~~~

In the **Layout** block, replace the `src/lib/` line and add the test dir:

```
src/app/        routes only — (marketing) group, api/ handlers, dashboard/
src/components/ ui/ = dumb primitives · features/<feature>/ = composed
src/lib/        api/ (server) · queries/ (browser) · hooks/ · utils/ · validators/
src/types/      shared types, inferred from validators
src/config/     env.ts (zod-parsed at load) · constants.ts
src/test/       test helpers (render-with-query)
```

In **Repo gotchas**, the Next 16 / React 19 bullet cites
`src/lib/hooks/use-async.ts`, which Task 6 deleted. Replace that sentence:

~~~markdown
  See `src/lib/hooks/use-debounce.ts` for the pattern that satisfies them
  (state synced from an effect with a cleanup, never written during render).
~~~

Add to **Repo gotchas**:

```
- **TanStack Query is client-only here.** `QueryProvider` is mounted in the root
  layout; Server Components still `await` `lib/api` functions directly. There is
  no `HydrationBoundary`, so a client section shows its loading state on first
  paint — that is deliberate, not a bug. Tests stub at the `internalApi` seam
  (`vi.mock('@/lib/api/instances', …)`), never at global `fetch`; the one
  exception is `src/lib/api/client.test.ts`, which tests the wrapper itself.
```

- [x] **Step 2: Update `README.md`**

In the **Scripts** table, add after the `typecheck` row:

```
| `npm test` | Vitest run, once (jsdom + Testing Library) |
| `npm run test:watch` | Vitest in watch mode |
```

Replace the gate block and the "no test runner" paragraph (`README.md:49-56`)
with:

~~~markdown
Before calling a change done, run the full gate:

```bash
npm run typecheck && npm run lint && npm run build && npm test
```

Tests live beside what they test, as `*.test.ts` / `*.test.tsx` under `src/`.
They stub the network at the `internalApi` seam rather than at global `fetch`,
so the "only one `fetch`" rule holds in tests too.
~~~

In the **Structure** tree, replace the `lib/` subtree and add `test/`:

```
  lib/
    api/                      # the fetch wrapper + configured clients
      client.ts               # base fetch wrapper (headers, timeout, zod, errors)
      errors.ts               # ApiError
      instances.ts            # internalApi — browser-safe BFF client
      instances.server.ts     # externalApi — server-only upstream client
      users.ts                # typed functions per resource
    queries/                  # BROWSER-side data access (TanStack Query)
      client.ts               # createQueryClient — cache and retry policy
      provider.tsx            # QueryProvider, mounted in the root layout
      bff.ts                  # reads the { data } envelope from a route handler
      users.ts                # userQueries + userMutations
    hooks/                    # use-debounce
    utils/                    # cn, format, http (route-handler helpers)
    validators/               # zod schemas
  types/                      # shared TS types (inferred from schemas)
  config/                     # env (zod-validated), constants
  test/                       # test helpers (render-with-query)
```

Replace the data-flow diagram with:

```
Server Component  ──────────────────────────────────►  usersApi.list()  ─►  externalApi  ─►  upstream
Client Component  ─►  useQuery(userQueries.list())  ─►  /api/users  ─►  usersApi.list()  ─►  externalApi  ─►  upstream
```

Replace the `lib/hooks/use-users.ts` bullet with these two:

```
- **`lib/queries/users.ts`** — the browser's door to the data. Key and fetcher
  are declared together in one `queryOptions()` call, so a cache key can never
  drift from the function that fills it; `userMutations.create()` takes the
  `QueryClient` and invalidates `['users']` itself. Server twin of this file is
  `lib/api/users.ts` — same resource, different side of the wire.
- **`lib/queries/bff.ts`** — the read-side mirror of `ok()`: one place unwraps
  the `{ data }` envelope and validates the payload against its zod schema.
```

Replace the **Adding a resource** convention bullet with:

```
- **Adding a resource** = a schema in `lib/validators/`, a type in `types/`, a
  server `lib/api/<resource>.ts`, a route handler, and a browser
  `lib/queries/<resource>.ts`. Five small files, always the same shape.
- **Client data goes through a query factory.** Components never call
  `internalApi` directly — they call `useQuery(userQueries.list())`. Keys are
  hierarchical (`['users'] → ['users','list'] → ['users','list',params]`), so
  invalidating the root reaches lists and details alike.
```

- [x] **Step 3: Update the spec status**

In `docs/superpowers/specs/2026-09-06-tanstack-query-design.md`, set
**Status** to `Implemented` and **Updated** to today's date.

- [x] **Step 4: Prove the docs are consistent with the code**

Run: `grep -rn "useAsync\|use-users\|useUsers\|no test runner\|Four small files" README.md CLAUDE.md`
Expected: no matches.

Run: `grep -rn "npm test" README.md CLAUDE.md`
Expected: at least one match in each file.

Run: `grep -rn "fetch(" src --include=*.ts --include=*.tsx | grep -v ".test."`
Expected: matches only in `src/lib/api/client.ts` — invariant #1 still holds.

- [x] **Step 5: Verify the whole gate**

Run: `npm run typecheck && npm run lint && npm run build && npm test`
Expected: all exit 0.

- [x] **Step 6: Commit**

```bash
git add README.md CLAUDE.md docs/superpowers/specs/2026-09-06-tanstack-query-design.md
git commit -m "docs: document the TanStack Query layer and its conventions"
```

---

## Decision Log

Rulings made during execution, and anything parked. Append-only.

| Date | Decision | Why | Cost if wrong |
|---|---|---|---|
| 2026-09-06 | Added Task 3 (error envelope propagation), which the spec does not list as a component | The spec's error table requires 422 field messages to reach the form via `ApiError.fields`, but `src/lib/api/client.ts` drops `code` and `fields` on a non-2xx. Without this, Task 7 cannot meet the spec | If unwanted, Task 7's form falls back to showing only `error.message` and Task 3 reverts cleanly on its own commit |
| 2026-09-06 | `UserDetail` guards on `null` and delegates to a private child, instead of using `enabled` | Avoids hashing a placeholder id into a cache key, and keeps the hook unconditional | If `enabled` is preferred later, it is a one-component change; the key factory is unaffected |

---

## Before marking this plan Approved

Run this checklist yourself — it is not a subagent dispatch.

- [x] **Spec coverage** — every spec requirement maps to a task.
- [x] **Placeholder scan** — no `<...>`, `TBD`, `TODO`, "add error handling",
      "handle edge cases", "write tests for the above", "similar to Task N".
      Every code step contains real, runnable code.
- [x] **Type consistency** — names and signatures produced in early tasks match
      what later tasks consume.
- [x] **Right-sized tasks** — each task ends in an independently testable
      deliverable a reviewer could reject on its own.
- [x] **Status block filled** — Status, Created, Updated, Spec, Branch.
