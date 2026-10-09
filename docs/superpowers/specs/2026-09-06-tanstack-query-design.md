# Tanstack Query Design

> Produced by `superpowers:brainstorming` (architectural path). Once this
> document is `Approved`, the only next skill is `superpowers:writing-plans`.
> File naming: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`.

| | |
|---|---|
| **Status** | `Implemented` |
| **Created** | 2026-09-06 |
| **Updated** | 2026-09-06 |
| **Owner** | juni |
| **Plan** | `docs/superpowers/plans/2026-09-06-tanstack-query.md` |
| **Supersedes** | `n/a` |
| **Superseded by** | `n/a` |

**Status values:** `Draft` → `In Review` (user reading it) → `Approved` (plan may
be written) → `Implemented`. Off-ramps: `Superseded` (link the replacement) ·
`Abandoned` (say why in the Decision Log).

This spec is the binding authority during execution: when a plan and this
document disagree, this document wins. Keep **Status** and **Updated** current —
an executor reads both files and rules against this one.

---

## Summary

Replace the hand-rolled `useAsync` data-fetching primitive with TanStack Query
v5 on the client side only, and establish a `queryOptions`-factory convention
that every future resource follows. Server Components keep awaiting
`src/lib/api/*` functions directly; nothing about the BFF, the single `fetch`
wrapper, or the response envelope changes. The payoff is caching, dedupe,
status-aware retry and real mutations with cache invalidation — the three things
`useAsync`'s own doc comment says to adopt TanStack for.

## Context

Client-side reads today run through three files:

- `src/lib/hooks/use-async.ts` — a ~50-line primitive that tracks
  `data`/`error`/`isLoading` and discards stale runs. No cache, no dedupe, no
  mutations. Its doc comment already names TanStack Query as the intended
  successor.
- `src/lib/hooks/use-users.ts` — the one call site, reading `/api/users`
  through `internalApi` and parsing with `userListSchema`.
- `src/components/features/users/user-search.tsx` — the one consumer.

Two endpoints exist with no caller at all: `GET /api/users/[id]`
(`src/app/api/users/[id]/route.ts`) and `POST /api/users`
(`src/app/api/users/route.ts`, with `createUserSchema` already written). So the
repo currently documents a resource contract it only half demonstrates.

What forces this now: the team is split backend/frontend with its own upstream
API layer, so the browser side is where the convention has to be sharp. A
boilerplate whose client story is "a primitive we told you to replace" pushes
that decision onto every project spawned from it.

## Non-goals

- **Server-side prefetch and hydration.** No `dehydrate()`, no
  `<HydrationBoundary>`, no per-request `getQueryClient()`. Server Components
  keep awaiting `usersApi.*` directly. Trigger to revisit: a page where the
  first-paint spinner in the client section becomes a real UX problem.
- **Routing TanStack through Server Components.** The App Router's own fetch
  cache (`next: { revalidate, tags }`) stays the server-side caching mechanism.
- **Browser-to-upstream calls.** The browser keeps talking to `/api/*` only; it
  never learns `API_BASE_URL` and never holds `API_TOKEN`.
- **Infinite/paginated query helpers.** `userQueries.list` takes a params
  object; `infiniteQueryOptions` is not wired up. Trigger: a real paginated list
  in a consuming project.
- **Optimistic updates.** The create mutation invalidates and refetches.
  `onMutate`/rollback is deliberately not demonstrated.
- **Changing the `build` script.** `package.json` has plain `next build`, which
  is correct: Next 16 runs TypeScript as part of the build ("Running
  TypeScript …" in its output), so `CLAUDE.md`'s "runs typecheck + prerender" is
  accurate. `npm run typecheck` stays in the gate as the fast standalone check.

## Success criteria

- [x] `src/lib/hooks/use-async.ts` and `src/lib/hooks/use-users.ts` no longer
      exist; `rg "useAsync" src` returns nothing.
- [x] `rg "fetch\(" src` matches only `src/lib/api/client.ts` (invariant #1
      still holds).
- [x] The dashboard's client section reads through
      `useQuery(userQueries.list(...))`, filters and refreshes as it does today.
- [x] Submitting the new create-user form makes the list refetch through cache
      invalidation, with no manual `setState` of list data anywhere.
- [x] Selecting a user renders detail data fetched by
      `userQueries.detail(id)`, and the detail query does not run while no user
      is selected.
- [x] `npm test` exists and passes; it covers key hierarchy, `bff()` unwrapping,
      the retry predicate, and the `UserSearch` loading→data→error path.
- [x] `npm run typecheck && npm run lint && npm run build && npm test` all pass
      with fresh output.
- [x] `CLAUDE.md` and `README.md` describe the query layer, and neither still
      tells a reader to use `useAsync`.

---

## Approaches considered

### Recommended: client-only TanStack, `queryOptions` factory per resource

TanStack Query owns Client Components. Each resource gains one browser-side
module, `src/lib/queries/<name>.ts`, exporting a factory whose entries are built
with v5's `queryOptions()` / `mutationOptions()` helpers — key and fetcher
declared together, so the same object can be passed to `useQuery`,
`invalidateQueries`, `prefetchQuery` or `setQueryData`. Server Components are
untouched.

**Why:** the smallest change that actually buys the features; it leaves every
existing invariant intact; and co-declaring key with fetcher removes the single
most common failure mode of a query layer — a key that drifts from the function
that fills it. Keeping the server path as a plain `await` also preserves the
dashboard's deliberate side-by-side contrast between the two ways to read one
resource.

**Costs:** two modules per resource (server `lib/api/<name>.ts`, browser
`lib/queries/<name>.ts`), which the docs must explain or people will put the
wrong import in the wrong bundle. No hydration means the client section still
shows a spinner on first paint.

### Alternative: client + server prefetch with `HydrationBoundary`

Server Components call `prefetchQuery` and pass `dehydrate(qc)` down, so client
hooks mount warm.

**Rejected because:** it requires a per-request `getQueryClient()` singleton and
a key that matches exactly on both sides — convention that has to be right in
two places for every page. The benefit is a first-paint flash on one demo
section of a boilerplate. Explicitly listed as a non-goal with a trigger to
revisit.

### Alternative: hook-per-operation (`useUsers`, `useUser`, `useCreateUser`)

Keep today's shape, with a separate `userKeys` factory beside the hooks.

**Rejected because:** keys and fetchers live in different files and drift; every
operation costs a wrapper that exists only to call `useQuery`; and the resulting
hooks are unusable outside React, so prefetching or seeding the cache needs the
keys re-derived by hand.

---

## Design

### Architecture

Three layers, unchanged in count, with the client layer swapped:

```
Server Component ─► lib/api/<name>.ts ─► externalApi ─► upstream    (unchanged)
Client Component ─► lib/queries/<name>.ts ─► internalApi ─► /api/<name> ─► lib/api ─► upstream
```

The controlling constraint is that `src/lib/api/users.ts` is **server-only**: it
imports `externalApi`, which reads `API_TOKEN` via `serverEnv()`. A browser
query function therefore cannot reuse it, and each resource ends up with two
modules with different jobs:

| File | Runs | Talks to | Owns |
|---|---|---|---|
| `src/lib/api/<name>.ts` | server | upstream via `externalApi` | upstream shape, `next: { revalidate, tags }` |
| `src/lib/queries/<name>.ts` | browser | `/api/<name>` via `internalApi` | query keys, `queryOptions`, `mutationOptions` |

New directory:

```
src/lib/queries/
  client.ts      createQueryClient() — all defaults live here
  provider.tsx   'use client' QueryProvider + devtools
  bff.ts         envelope unwrapper (the read-side mirror of ok())
  users.ts       userQueries + userMutations
  index.ts       barrel — safe to import from a Client Component
```

**Against the `CLAUDE.md` invariants.** None are bent:

- #1 (one `fetch`) — `bff()` calls `internalApi`, which calls `client.ts`.
- #2 (thin routes) — `src/app/layout.tsx` gains a provider wrapper, which is
  composition, not logic.
- #3, #4 (BFF, envelope) — route handlers unchanged; `bff()` is the first
  *reader* of the envelope rather than a second writer of it.
- #5 (validators are truth) — query functions validate with the existing
  schemas; `ListUsersParams` is inferred from `listUsersQuerySchema`.
- #6 (server-only stays server-only) — reinforced. `src/lib/queries/*` imports
  `internalApi` from `@/lib/api/instances` **directly, never the
  `@/lib/api` barrel**, because that barrel re-exports `externalApi` and
  `usersApi`. This is a hard rule, stated in the docs.
- #7 (`ApiError` is the currency) — the retry predicate reads `error.status`,
  the first place the invariant buys something concrete.

One wrinkle worth naming: `provider.tsx` is a React component living under
`src/lib/`. It is not a `ui/` primitive and not a `features/` composition, and
`src/app/` is routes-only. Keeping it beside the client it configures is the
chosen trade-off, recorded in the Decision Log.

### Components

**`src/lib/queries/client.ts`**
- **Does:** builds a `QueryClient` with the app's defaults — one place to change
  cache and retry policy.
- **Used as:** `createQueryClient(): QueryClient`
- **Depends on:** `@tanstack/react-query`, `ApiError` from `@/lib/api/errors`.

**`src/lib/queries/provider.tsx`**
- **Does:** mounts `QueryClientProvider` (and devtools) for the whole app.
- **Used as:** `<QueryProvider>{children}</QueryProvider>`, a `'use client'`
  component rendered in `src/app/layout.tsx`.
- **Depends on:** `createQueryClient`, `@tanstack/react-query-devtools`.

**`src/lib/queries/bff.ts`**
- **Does:** performs one browser request to a route handler, unwraps the
  `{ data }` envelope, and validates the payload against a zod schema.
- **Used as:** `bff<T>(path, options): Promise<T>` (signature below).
- **Depends on:** `internalApi` from `@/lib/api/instances`, `ApiError`.

**`src/lib/queries/users.ts`**
- **Does:** declares every browser-side query and mutation for the `users`
  resource, with its key hierarchy.
- **Used as:** `userQueries.{all,lists,list,details,detail}`,
  `userMutations.create(queryClient)`.
- **Depends on:** `bff`, `userSchema`/`userListSchema` from
  `@/lib/validators/user`, `CreateUserInput` / `User` / `ListUsersParams` from
  `@/types/user`.

**`src/components/features/users/user-create-form.tsx`** (new, client)
- **Does:** collects name + email, runs the create mutation, renders field
  errors from `ApiError.fields`.
- **Used as:** `<UserCreateForm />`
- **Depends on:** `userMutations`, `useQueryClient`, `Button`, `Input`.

**`src/components/features/users/user-detail.tsx`** (new, client)
- **Does:** renders one user fetched by id; renders nothing while `userId` is
  `null`.
- **Used as:** `<UserDetail userId={number | null} />`
- **Depends on:** `userQueries.detail`, `Card`, `Spinner`.

### Data flow

Creating a user, end to end — the path that exercises the whole design:

```
UserCreateForm  ─► useMutation(userMutations.create(qc))
                ─► bff('/api/users', { method: 'POST', body, schema: userSchema })
                ─► internalApi.post ─► client.ts fetch ─► POST /api/users
                                                          ├─ parseBody(createUserSchema)
                                                          ├─ usersApi.create() ─► externalApi ─► upstream
                                                          └─ ok(user, { status: 201 })
                ◄─ { data: User }  ─► bff unwraps + validates ─► User
                ─► onSuccess: qc.invalidateQueries({ queryKey: userQueries.all() })
                ─► UserSearch's list query refetches; UserDetail's cache is stale too
```

Reading the list is the same path with `useQuery(userQueries.list(params))` and
`GET`. The server-rendered section of the dashboard is untouched:
`await usersApi.list({ pageSize: 4 })`.

### Interfaces and contracts

```ts
// src/lib/queries/bff.ts
export interface BffOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; // default 'GET'
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  schema: ZodType<T>;
}

export function bff<T>(path: string, options: BffOptions<T>): Promise<T>;
```

`bff()` must **not** pass `schema` through to `internalApi`. The client's own
`schema` option validates the whole response body, which here is the envelope;
`bff()` requests `ApiResponse<unknown>`, extracts `data`, and validates that.
A 2xx body carrying `error`, or carrying no `data` key, throws
`ApiError({ status: 502, code: 'invalid_response' })`.

```ts
// src/types/user.ts   (added — inferred, per invariant #5)
export type ListUsersParams = Partial<z.infer<typeof listUsersQuerySchema>>;

// src/lib/queries/users.ts
export const userQueries = {
  all:     () => ['users'] as const,
  lists:   () => [...userQueries.all(), 'list'] as const,
  list:    (params: ListUsersParams = {}) => queryOptions({
             queryKey: [...userQueries.lists(), params],
             queryFn:  () => bff('/api/users', { params, schema: userListSchema }),
           }),
  details: () => [...userQueries.all(), 'detail'] as const,
  detail:  (id: number) => queryOptions({
             queryKey: [...userQueries.details(), id],
             queryFn:  () => bff(`/api/users/${id}`, { schema: userSchema }),
           }),
};

export const userMutations = {
  create: (queryClient: QueryClient) => mutationOptions({
    mutationFn: (input: CreateUserInput) =>
      bff('/api/users', { method: 'POST', body: input, schema: userSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userQueries.all() }),
  }),
};
```

```ts
// src/lib/queries/client.ts
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,        // mirrors next: { revalidate: 60 } in lib/api/users.ts
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

The provider builds its client with `useState(() => createQueryClient())` —
never a module-level singleton, which would share cache across requests during
SSR.

**Three rules that constitute the convention**, to be stated in `CLAUDE.md`:

1. **The key mirrors the URL.** `['users', 'list', params]` ↔ `/api/users?…`.
   Params are always a single object; TanStack hashes it order-independently.
2. **Key and fetcher are declared together**, in one `queryOptions()` call.
3. **Mutations own their invalidation.** The factory takes the `QueryClient`, so
   skipping invalidation requires deliberately not using the factory.

No new response shapes. Everything stays `{ data }` / `{ error }` per
`src/types/api.ts`.

### Error handling

The boundary is unchanged: `ApiError` thrown in `lib/api` → serialized by
`route()` → re-thrown browser-side by `client.ts` → surfaced by the query's
`error` field. `bff()` adds one new failure of its own (`invalid_response`).

| Failure | Status | `code` | Surfaced as |
|---|---|---|---|
| Invalid create-user input | 422 | `validation_error` | field messages under each input, from `ApiError.fields` |
| Unknown user id | 404 | `not_found` | `UserDetail` renders "User not found"; **not retried** |
| Response payload fails its schema | 502 | `invalid_response` | query `error`; retried twice (treated as transient upstream drift) |
| Upstream unreachable | 503 | `network_error` | list shows the error line with a working Refresh; retried twice |
| Upstream timeout | 408 | `timeout` | same as above; **not retried** (status < 500) |

Query errors stay inside the component (the existing `role="alert"` line); they
do not escalate to `src/app/dashboard/error.tsx`, which continues to catch
throws from the Server Component path only.

### Testing

The repo had no test runner when this spec was written, so **the plan's first
task added Vitest** — `vitest`, `@vitejs/plugin-react`, `jsdom`,
`@testing-library/react`, `@testing-library/jest-dom`,
`@testing-library/user-event`, a `vitest.config.mts` with the `@/*` path alias,
a setup file, an `npm test` script, and test files included in `tsconfig.json`.
Every task after it ran red-green. That setup now exists — a future execution
should use it, not re-add it.

Behaviors worth a test:

- **Key hierarchy** — `userQueries.all()` is a prefix of both `list()` and
  `detail()`'s keys; `list({ page: 1 })` and `list({ page: 2 })` differ;
  `list({ page: 1, pageSize: 10 })` and `list({ pageSize: 10, page: 1 })` hash
  to the same key.
- **`bff()`** — unwraps `{ data }`; throws `ApiError` with
  `code: 'invalid_response'` and `status: 502` when the payload fails its
  schema; propagates the `ApiError` that `client.ts` throws on a non-2xx.
- **Retry predicate** — returns `false` for a 404 `ApiError`; for a 503 returns
  `true` at `failureCount` 0 and 1, `false` at 2.
- **`UserSearch`** — with a test `QueryClient` (`retry: false`), renders the
  loading state, then the list; renders the error line when the query rejects;
  filters the rendered list by the debounced query.
- **Create mutation** — a successful submit invalidates `['users']`, and the
  list query refetches (assert on the fetch count or the rendered rows).

Component tests stub the network at `internalApi`'s boundary rather than
patching global `fetch`, keeping invariant #1 honest in tests too.

---

## Global Constraints

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

## Open questions

None.

## Decision Log

| Date | Decision | Why | Cost if wrong |
|---|---|---|---|
| 2026-09-06 | Client-only TanStack; no hydration boundary | Team is split backend/frontend with its own upstream API layer, so the browser side is where convention matters; Next's fetch cache already handles the server | Adding prefetch later means a `getQueryClient()` per-request singleton and matched keys on both sides — additive, no rewrite of the factories |
| 2026-09-06 | Browser keeps going through the BFF | Token stays server-side, browser never learns the upstream URL, no CORS; the handler is where the frontend adapts what the backend ships | If the double hop ever hurts, a direct-to-backend client means `NEXT_PUBLIC_` base URL and a new auth story |
| 2026-09-06 | `queryOptions` factory over hook-per-operation | Key and fetcher can't drift; the same object works in `useQuery`, `invalidateQueries`, `setQueryData` | Call sites read `useQuery(userQueries.list())` instead of `useUsers()`; mechanical to wrap later if disliked |
| 2026-09-06 | Delete `useAsync` | Its own doc comment names TanStack as its successor; two data-fetching primitives in a boilerplate teaches the wrong lesson | Non-HTTP async work in a consuming project writes its own hook, or pulls the deleted file from git history |
| 2026-09-06 | Mutation factories take the `QueryClient` and own invalidation | A convention should make the correct thing the default; forgetting to invalidate is the classic TanStack bug | Call sites that want different invalidation must override `onSuccess`, which is one line |
| 2026-09-06 | `provider.tsx` lives in `src/lib/queries/` | Not a `ui/` primitive, not a `features/` composition, and `src/app/` is routes-only; keeping it beside the client it configures wins on cohesion | A one-file move to `src/components/providers/` plus one import change |
| 2026-09-06 | Ship the mutation, detail query and devtools with the conversion | `POST /api/users` and `GET /api/users/[id]` currently have zero callers; a convention that is documented but never demonstrated gets misread | More surface to maintain in a boilerplate whose `users` resource is meant to be deleted by consumers |

---

## Before marking this spec In Review

Run this yourself with fresh eyes — it is a checklist, not a subagent dispatch.

- [x] **Placeholder scan** — no `<...>`, `TBD`, `TODO`, empty sections, or vague
      requirements ("appropriate error handling", "handle edge cases").
- [x] **Internal consistency** — no section contradicts another; the
      architecture matches the component list and the data flow.
- [x] **Scope check** — this is one implementation plan's worth of work. If it
      describes multiple independent subsystems, decompose it: each sub-project
      gets its own spec → plan → implementation cycle, and this document becomes
      the first of them.
- [x] **Ambiguity check** — no requirement can be read two ways. Where one
      could, pick a reading and make it explicit.
- [x] **Status block filled** — Status, Created, Updated, Owner.

Then hand off:

> "Spec written and committed to `<path>`. Please review it and let me know if
> you want any changes before I write the implementation plan."

On approval, set **Status** to `Approved` and invoke `superpowers:writing-plans`.
