# Direct Rest Design

> Produced by `superpowers:brainstorming` (architectural path). Once this
> document is `Approved`, the only next skill is `superpowers:writing-plans`.
> File naming: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`.

| | |
|---|---|
| **Status** | `Implemented` |
| **Created** | 2026-10-02 |
| **Updated** | 2026-10-02 |
| **Owner** | juni |
| **Plan** | `docs/superpowers/plans/2026-10-02-direct-rest.md` |
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

Remove the BFF layer. The browser calls the upstream REST API directly
through the same axios client the server uses. Each resource is one module,
`src/lib/api/<name>.ts`, and it works on server and browser alike. Server
Components await it, and TanStack query factories wrap it. The route handlers,
the `{ data }` envelope, `bff()` and `http.ts` all go. A resource drops from
five files to four.

## Context

Today every client read or write takes the path browser → `src/app/api/users/**`
(route handlers wrapped in `route()`, built with `ok()`/`fail()` from
`src/lib/utils/http.ts`) → `usersApi` (`src/lib/api/users.ts`, server-only) →
`externalApi` (`src/lib/api/instances.server.ts`, carries `API_TOKEN`) → upstream.
On the way back, `bff()` (`src/lib/queries/bff.ts`) unwraps the envelope through
`internalApi` (`src/lib/api/instances.ts`).

The owner moved another production app off this shape after measuring it
side by side. The BFF added a hop to
every call, ten route handlers, and a second layer to debug. The REST branch
deleted about 1,600 lines. Templify is the starting point for new projects, so
it should default to the architecture the owner actually wants to start from.

## Non-goals

- **No SSR seeding.** No `prefetchQuery` and no `HydrationBoundary`. Client
  sections still show a loading state on first paint, as documented in CLAUDE.md.
  This would come back as its own spec if a project needs a no-spinner first paint.
- **No auth.** There is no per-user token, no cookie handling and no login. The
  client's existing `headers` hook is the extension point, and nothing here uses it.
- **No server-side secret path.** `API_TOKEN` is removed, not moved somewhere
  else. A project that needs a secret adds a server-only module of its own (see
  invariant 6 below).
- **No `revalidateTag` on mutation.** That gap exists today too.
- **No change to `createApiClient`'s public API** (`ApiClient`, `RequestOptions`,
  `ApiClientConfig`).
- The historical TanStack spec and plan (`2026-09-06-*`) are left untouched.

## Success criteria

- [x] `src/app/api/` does not exist, and `npm run build` lists no `/api/*` route.
- [x] `grep -rnE "internalApi|externalApi|bff|app/api|API_TOKEN|(^|[^_])API_BASE_URL|NEXT_PUBLIC_APP_URL|ApiResponse" src`
      prints nothing.
- [x] On `/dashboard` under `npm run dev`, the browser's user requests go to
      `https://jsonplaceholder.typicode.com/users…` and none go to `/api/users`.
- [x] On `/dashboard`, search, detail selection and create all work. Submitting
      an invalid email shows the field message under the Email input without any
      network request.
- [x] `rm -rf .next && npm run typecheck && npm run lint && npm run build && npm test`
      passes.
- [x] CLAUDE.md describes the four-file resource and the invariants below, with
      no BFF wording left.

---

## Approaches considered

### Recommended: isomorphic resource modules

One configured client (`api`) and one module per resource that works on both
server and browser. Server Components call `usersApi.list()`, and query
factories call the same function in `queryFn`.

**Why:** every URL, query-param mapping and schema lives in exactly one place,
so a server read and a client read of the same resource can't drift apart.
**Costs:** `lib/api/<name>.ts` can no longer import anything server-only. A
resource that needs a secret has to be split out deliberately.

### Alternative: separate server and browser modules per resource

Keep `lib/api/<name>.ts` server-only and give `lib/queries/<name>.ts` its own
direct calls. **Rejected because:** it duplicates every URL and schema, which is
exactly the drift the current "key and fetcher declared together" rule exists
to prevent.

### Alternative: generated client from an OpenAPI document

**Rejected because:** the reference upstream (jsonplaceholder) has no spec, and
generation is a separate decision that's orthogonal to removing the BFF.

---

## Design

### Architecture

```
Server Component  ─►  usersApi.list()            ─►  api  ─►  upstream
Client Component  ─►  useQuery(userQueries.list()) ─► usersApi.list() ─► api ─► upstream (CORS)
```

Invariants after the change. Each one replaces its numbered entry in
CLAUDE.md, and the numbering is kept.

1. **One HTTP client.** Only `src/lib/api/client.ts` performs HTTP and imports
   `axios`. Everything else uses `api` from `src/lib/api/instances.ts`. The
   `adapter: 'fetch'` rule and its explanation stay word for word: Server
   Component reads still rely on `next: { revalidate, tags }`.
2. **Routes are thin.** No change, except that `src/app/api/` no longer exists.
   Adding a route handler is now an exception (webhooks, OG images). It is not
   a data path for the app's own UI.
3. **Resource modules own the wire.** `src/lib/api/<name>.ts` holds the upstream
   path, the query-param mapping, input validation (`parseOrThrow`) and the
   response schema. Nothing else knows an upstream URL.
4. **No envelope.** Resource functions return the parsed payload, or throw
   `ApiError`. There is no `{ data }` wrapper anywhere.
5. Validators are the source of truth. No change.
6. **No secrets in `api`.** `api` and every `lib/api/<name>.ts` ship to the
   browser. Secrets live only behind `serverEnv()` in a module whose first line
   is `import 'server-only'`, and such a module must never be imported by a
   resource module or a Client Component. The `server-only` dependency stays
   for that purpose.
7. **`ApiError` is the only error currency.** No change.
8. **Client reads go through a query factory.** Client Components never call
   `api` or `<name>Api` directly. They use `useQuery(<name>Queries.<op>())`,
   whose `queryFn` calls `<name>Api.<op>()`. Mutation factories still take the
   `QueryClient` and own their own invalidation.

### Components

**`src/lib/api/client.ts`** (modified)
- **Does:** performs HTTP. Unchanged, except that `errorEnvelope()` and
  `isFieldMap()` are removed. They parsed the app's own `{ error: { message,
  code, fields } }` envelope, which nothing emits any more. `toApiError` keeps
  `extractMessage(payload) ?? \`${method} ${path} failed with ${status}\``, and
  `code` comes from `codeForStatus`.
- **Used as:** `createApiClient(config): ApiClient`. No change.
- **Depends on:** axios, `ApiError`, `API_TIMEOUT_MS`.

**`src/lib/api/instances.ts`** (modified)
- **Does:** configures the app's single client.
- **Used as:** `export const api: ApiClient`, built with
  `createApiClient({ baseUrl: clientEnv.NEXT_PUBLIC_API_BASE_URL, headers: { Accept: 'application/json' } })`.
- **Depends on:** `createApiClient`, `clientEnv`.

**`src/lib/api/instances.server.ts`**: deleted.

**`src/lib/validators/parse.ts`** (new)
- **Does:** turns a failed zod parse into the app's 422. This is `unwrap()`
  moved out of `http.ts`, and the field-keying stays the same: `issue.path.join('.') || '_'`.
- **Used as:** `export function parseOrThrow<T>(schema: ZodType<T>, input: unknown, message: string): T`.
  On success it returns parsed data, defaults applied. On failure it throws
  `new ApiError({ message, status: 422, code: 'validation_error', fields })`.
- **Depends on:** zod, `ApiError`. Re-exported from `src/lib/validators/index.ts`.

**`src/lib/api/users.ts`** (modified)
- **Does:** typed access to the upstream `users` resource, on server and browser.
- **Used as:**
  - `list(options?: ListUsersParams): Promise<User[]>` runs
    `parseOrThrow(listUsersQuerySchema, options, 'Invalid query parameters')`
    first, which applies `page: 1` and `pageSize: 20` by default, then
    `api.get('/users', { params: { _page, _limit }, schema: userListSchema, next: { revalidate: 60, tags: ['users'] } })`.
  - `byId(id: number): Promise<User>`. No change, apart from using `api`.
  - `create(input: CreateUserInput): Promise<User>` runs
    `parseOrThrow(createUserSchema, input, 'Invalid request body')` first, then
    `api.post('/users', { body: parsed, schema: userSchema, cache: 'no-store' })`.
    An invalid input sends no request.
- **Depends on:** `api`, the user validators, `parseOrThrow`.
  `import 'server-only'` is removed.

**`src/lib/queries/users.ts`** (modified)
- **Does:** query keys and options for `users`. The keys stay the same.
- **Used as:** `userQueries.list(params)` → `queryFn: () => usersApi.list(params)`.
  `userQueries.detail(id)` → `queryFn: () => usersApi.byId(id)`.
  `userMutations.create(qc)` → `mutationFn: (input) => usersApi.create(input)`,
  invalidating `userQueries.all()` on success. The doc comment changes: rule 1
  becomes "the key mirrors the resource and its params", and the BFF sentence
  is dropped.
- **Depends on:** `usersApi`, TanStack Query.

**`src/config/env.ts`** (modified)
- `clientSchema`: `NEXT_PUBLIC_API_BASE_URL: z.string().url().default('https://jsonplaceholder.typicode.com')`,
  read literally as `process.env.NEXT_PUBLIC_API_BASE_URL`.
  `NEXT_PUBLIC_APP_URL` is removed.
- `serverSchema`: `NODE_ENV` only. `API_BASE_URL` and `API_TOKEN` are removed.
  `serverEnv()` stays, with its browser guard, as the place future secrets go.

**Deleted:** `src/app/api/users/route.ts`, `src/app/api/users/[id]/route.ts`,
`src/app/api/users/route.test.ts`, `src/lib/queries/bff.ts`,
`src/lib/queries/bff.test.ts`, `src/lib/utils/http.ts`, `ApiResponse` from
`src/types/api.ts`, the `bff`/`BffOptions` exports from `src/lib/queries/index.ts`,
the `internalApi`/`externalApi` exports from `src/lib/api/index.ts` (replaced
by `api`), and the `http` note in `src/lib/utils/index.ts`.

`src/types/api.ts` keeps `ApiErrorBody`, which `ApiError.toBody()` returns, and
`Paginated<T>`. Its file comment changes to "Error shape `ApiError` serializes to."

**Copy-only changes:** `src/components/features/users/user-search.tsx`
("reads through the BFF" → "reads through TanStack Query"),
`user-create-form.tsx` ("Field messages come from the BFF's 422 envelope" →
"Field messages come from `parseOrThrow`'s 422, carried by ApiError"),
`src/app/dashboard/page.tsx` (heading "Client · TanStack Query → /api/users" →
"Client · TanStack Query → usersApi.list()", and the Server Component comment
"no route handler round-trip" is reworded), and `src/app/(marketing)/page.tsx`
(wherever it describes the BFF). The component logic stays the same.

### Data flow

Create user from the dashboard form:

```
UserCreateForm.mutate({ name, email })
  → userMutations.create(qc).mutationFn
  → usersApi.create(input)
      → parseOrThrow(createUserSchema, …)   ── invalid → ApiError 422 { fields } → form renders field messages, no request
      → api.post('/users', { body, schema: userSchema, cache: 'no-store' })
      → client.ts → axios (fetch adapter) → https://jsonplaceholder.typicode.com/users
  ← User
  → onSuccess: qc.invalidateQueries(['users']) → list refetches directly from upstream
```

### Interfaces and contracts

```ts
// src/lib/validators/parse.ts
export function parseOrThrow<T>(schema: ZodType<T>, input: unknown, message: string): T;

// src/lib/api/instances.ts
export const api: ApiClient;

// src/lib/api/users.ts
export const usersApi = {
  list(options?: ListUsersParams): Promise<User[]>;
  byId(id: number): Promise<User>;
  create(input: CreateUserInput): Promise<User>;
};

// src/lib/api/index.ts
export { createApiClient } from './client';
export type { ApiClient, ApiClientConfig, RequestOptions } from './client';
export { ApiError } from './errors';
export { api } from './instances';
export { usersApi } from './users';

// src/types/api.ts
export interface ApiErrorBody { message: string; code: string; fields?: Record<string, string[]> }
export interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number }
```

Responses aren't wrapped. A resource function returns the schema-parsed
upstream payload.

### Error handling

| Failure | Status | `code` | Surfaced as |
|---|---|---|---|
| Invalid create input | 422 | `validation_error` | field messages under the inputs; root (`_`) messages in the form's alert |
| Invalid list options (e.g. `pageSize: 500`) | 422 | `validation_error` | the query's `error.message`; not retried (status < 500) |
| Upstream 4xx/5xx | upstream status | `codeForStatus(status)` | `error.message`, from `extractMessage` or `"<METHOD> <path> failed with <status>"` |
| Payload does not match schema | 502 | `invalid_response` | `error.message` |
| Network failure / CORS rejection | 503 | `network_error` | `error.message` |
| Timeout | 408 | `timeout` | `error.message` |
| Server Component read fails | any | any | `src/app/dashboard/error.tsx` (unchanged) |

Upstream errors now reach the browser unredacted. With no BFF, nothing sits in
between to rewrite them. That's accepted, and it's recorded in the caveats.

### Testing

- **Seam:** `vi.mock('@/lib/api/instances', () => ({ api: { get, post, put, patch, delete } }))`.
  Mocks resolve to **raw payloads**, not `{ data }`. This replaces `internalApi`
  in `src/lib/queries/users.test.ts` and the three component tests.
  `src/lib/api/client.test.ts` stays the one test that stubs `fetch`.
- **New `src/lib/api/users.test.ts`:**
  - `create` with `{ name: 'A', email: 'nope' }` rejects with an `ApiError` that
    has status 422, code `validation_error`, and `fields.name` and
    `fields.email` set, and `api.post` is not called.
  - `create` with valid input calls `api.post('/users', …)` with the parsed body.
  - `list({ pageSize: 500 })` rejects with 422 and `fields.pageSize`, and
    `api.get` is not called.
  - `list({ pageSize: 4 })` calls `api.get('/users', …)` with
    `params: { _page: 1, _limit: 4 }` and `next.tags` containing `'users'`.
- **New `src/lib/validators/parse.test.ts`:** a nested path keys as `a.b`, and a
  root-level `.refine()` issue keys as `_`.
- **`src/lib/queries/users.test.ts`:** the fetcher tests now assert
  `api.get('/users', …)` with `_page`/`_limit`, and `api.get('/users/1', …)`.
  The key tests stay the same.
- **`client.test.ts`:** the "carries code and fields from an error envelope"
  and "ignores a malformed error key" tests are replaced by one test: a
  `{ error: { message, code } }` body yields `message` from the nested message
  (via `extractMessage`) and `code` from the status.
- **Component tests:** they now mock `api` with unwrapped payloads. The
  create-form field-error test can drive real validation (submit an invalid
  email, expect the message, expect `post` not called) instead of mocking a
  422 rejection.

---

## Global Constraints

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

## Direct REST caveats (goes into CLAUDE.md)

- The upstream must allow CORS from the app's origin.
- The upstream must not need a secret. Anything in `NEXT_PUBLIC_*` or `api`
  is public.
- Backend load grows with the number of viewers, because there's no shared
  server cache in front of client reads. If the upstream rate-limits per IP
  behind a proxy, a busy page turns into 429s. That was the other app's finding.
  A project that hits this can add a route handler as a cache for just those
  reads.
- Upstream error messages reach users without being rewritten.

## Open questions

None.

## Decision Log

| Date | Decision | Why | Cost if wrong |
|---|---|---|---|
| 2026-10-02 | Fully direct, no secret; `API_TOKEN` removed | Owner's choice; matches the other app's REST migration | A project needing a secret adds one server-only module (small) |
| 2026-10-02 | No SSR seeding in this change | Keep scope to the swap | Seeding is additive later; no rework |
| 2026-10-02 | Isomorphic `lib/api/<name>.ts`, four files per resource | One home per URL and schema | Splitting a resource later is local to that resource |
| 2026-10-02 | Input validation moves into resource functions via `parseOrThrow` | Keeps 422 + `fields` UX and the list-param bounds without a BFF | None beyond the moved tests |
| 2026-10-02 | Remove `errorEnvelope` parsing from `client.ts` | No producer remains; dead contract | A future upstream using that exact shape loses `fields` mapping; re-add in that project |
| 2026-10-02 | Keep `serverEnv()` and `server-only` | The pattern for future secrets, with fail-fast | Slight dead weight in the template |

---

## Before marking this spec In Review

- [x] **Placeholder scan**
- [x] **Internal consistency**
- [x] **Scope check**: one plan
- [x] **Ambiguity check**
- [x] **Status block filled**
