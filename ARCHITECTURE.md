# Architecture

How Templify is put together today: the layers, the data flow, and where each
piece lives. `CLAUDE.md` holds the rules (the eight invariants); `README.md`
covers setup and scripts. This document explains the shape the code has as a
result of those rules.

## Current status

| | |
|---|---|
| Stack | Next.js 16.3 (App Router, Turbopack) · React 19.2 · TypeScript 5 · Tailwind CSS 4 |
| Data | axios 1.x (fetch adapter) · zod 4 · TanStack Query 5 |
| Tests | Vitest 5 · Testing Library · jsdom (10 test files) |
| Tooling | pnpm 11 · Node 24.x · deployed on Vercel (`main` → Production, `develop` → Preview) |
| Upstream | Any CORS-enabled REST API; defaults to jsonplaceholder |
| Resources | `users`, a reference example meant to be replaced |
| Completed work | TanStack Query on the client (spec/plan 2026-09-06) · direct REST from browser and server, BFF removed (spec/plan 2026-10-02) |

No database, no auth, no route handlers. The app is a client of one upstream
REST API.

## System overview

```
                     ┌──────────────────────── Next.js app ───────────────────────┐
                     │                                                            │
 Server render  ───▶ │  src/app/**/page.tsx (Server Component)                    │
                     │        │ await usersApi.list()                             │
                     │        ▼                                                   │
                     │  src/lib/api/users.ts ──▶ api (instances.ts) ──▶ client.ts │──▶ Upstream REST API
                     │        ▲                                                   │    (NEXT_PUBLIC_API_BASE_URL)
 Browser        ───▶ │  src/lib/queries/users.ts (queryOptions)                   │
                     │        ▲ useQuery / useMutation                            │
                     │  src/components/features/** ('use client')                 │
                     └────────────────────────────────────────────────────────────┘
```

There is no backend-for-frontend. The same resource module runs in both places:
Server Components call it directly, and Client Components reach it through a
TanStack Query factory. Both paths end in the one HTTP client.

## Layers

From the outside in. Each layer only imports from the layers below it.

### 1. Routes: `src/app/`

Thin. They compose components and await a `src/lib/api/*` function. They contain no
business logic, upstream URLs or `fetch` calls, and there is no `app/api/` directory.

| File | Role |
|---|---|
| `layout.tsx` | Root layout: fonts, metadata, mounts `QueryProvider` |
| `(marketing)/layout.tsx`, `(marketing)/page.tsx` | Route group serving `/` with its own chrome |
| `dashboard/page.tsx` | Demo of both read paths for the same resource |
| `dashboard/loading.tsx`, `dashboard/error.tsx` | Route-level Suspense fallback and error boundary |
| `not-found.tsx` | Global 404 |

`/` comes only from the `(marketing)` group. Adding `src/app/page.tsx` would collide with it.

### 2. Components: `src/components/`

- `ui/`: dumb primitives (`Button`, `Card`, `Input`, `Spinner`), barrel-exported.
- `features/<feature>/`: composed, feature-scoped components. For `users`:
  - `UserCard`, `UserList`: presentational and safe to render from a Server
    Component (`onSelect` is optional, so no function crosses the boundary).
  - `UserSearch`, `UserDetail`, `UserCreateForm`: Client Components that use
    `useQuery` / `useMutation` with the query factories. They never call `api` directly.

### 3. Query factories: `src/lib/queries/`

Client-side only. They wrap resource functions in TanStack Query options.

- `client.ts`: `createQueryClient()`, the single place cache and retry policy is set.
  `staleTime` is 60 s, matching `next: { revalidate: 60 }`. Retries are skipped for
  `ApiError` with status < 500. Mutations never retry.
- `provider.tsx`: `QueryProvider`, one `QueryClient` per browser session (created in
  `useState`, never module-level). It also mounts the devtools.
- `<name>.ts`: key hierarchy and fetcher declared together:
  `userQueries.all() → lists() → list(params)` and `all() → details() → detail(id)`.
  Mutation factories take the `QueryClient` and invalidate `all()` themselves.

There is no `HydrationBoundary`, so client sections show their loading state on
first paint. That's intended.

### 4. Resource modules: `src/lib/api/<name>.ts`

The only code that knows upstream paths. Each operation is an `async` function that:

1. validates input with `parseOrThrow` (an invalid input throws a 422 before any request),
2. maps params to upstream names (`page → _page`, `pageSize → _limit`),
3. calls `api.<verb>()` with a response `schema` and Next cache options
   (`revalidate: 60`, tags `users` / `user:<id>`; writes use `cache: 'no-store'`),
4. returns the parsed payload unwrapped, or rejects with `ApiError`.

These modules ship to the browser, so they must never import `server-only` code or
call `serverEnv()`.

### 5. HTTP client: `src/lib/api/client.ts` + `instances.ts`

`createApiClient(config)` is the only module that imports `axios`. `instances.ts`
exports the app's one configured instance, `api`, built from
`clientEnv.NEXT_PUBLIC_API_BASE_URL`.

Behaviours the rest of the app relies on:

| Concern | Behaviour |
|---|---|
| Adapter | Pinned to `adapter: 'fetch'`, so Next's patched `fetch` sees `next: { revalidate, tags }`. Load-bearing. |
| Request options | Anything left over after `params`/`body`/`schema`/`timeoutMs`/`headers` is forwarded as `fetchOptions` (`next`, `cache`, `credentials`, …). |
| Params | `null`, `undefined` and `''` are dropped. |
| Headers | Axios's default `Accept` is removed. In the browser, the `User-Agent` default is suppressed to avoid CORS preflights. Config headers never overwrite per-request ones. |
| Body | Empty body or 204 normalizes to `null`. |
| Validation | When `schema` is given, a mismatched response becomes `ApiError` 502 `invalid_response`. |
| Failures | Upstream non-2xx → `ApiError` with upstream status and extracted message. Timeout → 408 `timeout`. Network → 503 `network_error`. A non-axios error (e.g. a throwing `headers` function) propagates unchanged. |
| Timeout | `API_TIMEOUT_MS` (10 s) by default, overridable per client and per request. |

### 6. Errors: `src/lib/api/errors.ts`

`ApiError` is the only error type. It carries `status`, `code` (derived from status
when not given), optional `fields` for validation errors, and `url`. Route
`error.tsx` boundaries and client components read `error.message`. Forms read
`error.fields`, with root-level zod issues keyed as `_`.

### 7. Validators and types: `src/lib/validators/`, `src/types/`

zod schemas are the source of truth. `src/types/<name>.ts` only contains
`z.infer<…>` aliases, re-exported from `src/types/index.ts`. `parse.ts` turns a
failed parse into a 422 `ApiError` with dotted-path field keys.

### 8. Config: `src/config/`

- `env.ts`: `clientEnv` is parsed with zod at module load (it fails fast and must
  reference `process.env.NEXT_PUBLIC_*` literally so Next can inline it).
  `serverEnv()` is lazy and throws if called in the browser. It holds only
  `NODE_ENV` today.
- `constants.ts`: `APP_NAME`, `ROUTES`, `DEFAULT_PAGE_SIZE`, `API_TIMEOUT_MS`.

### Supporting code

- `src/lib/hooks/use-debounce.ts`: the reference pattern for React Compiler-safe
  effects.
- `src/lib/utils/`: `cn()` (a plain class joiner with no Tailwind conflict
  resolution), `formatDate`, `initials`, `truncate`.
- `src/test/render-with-query.tsx`: renders against a throwaway `QueryClient`
  with retries off.

## Request lifecycles

**Server read** (`/dashboard`, server section)

```
DashboardPage → <Suspense> → ServerRenderedUsers
  → usersApi.list({ pageSize: 4 })
  → parseOrThrow(listUsersQuerySchema)
  → api.get('/users', { params, schema, next: { revalidate: 60, tags: ['users'] } })
  → axios (fetch adapter) → Next data cache → upstream
  → userListSchema.parse → User[] → <UserList>
  (ApiError → dashboard/error.tsx)
```

**Client read** (`UserSearch`)

```
useQuery(userQueries.list({ pageSize: 10 }))
  → queryFn → usersApi.list(...) → api.get → browser fetch → upstream (CORS)
  → cached under ['users', 'list', { pageSize: 10 }] for 60 s; consumers share it
```

**Client write** (`UserCreateForm`)

```
useMutation(userMutations.create(queryClient))
  → usersApi.create(input) → parseOrThrow(createUserSchema)
      ├─ invalid → ApiError 422 { fields } → rendered next to the inputs, no request sent
      └─ valid   → api.post('/users', { cache: 'no-store' })
  → onSuccess: invalidateQueries(['users']) → lists and details refetch
```

## Server/browser boundary

| Module | Server | Browser | Notes |
|---|---|---|---|
| `lib/api/client.ts`, `instances.ts`, `<name>.ts` | ✓ | ✓ | Public: no secrets |
| `lib/validators/*`, `types/*` | ✓ | ✓ | |
| `lib/queries/*` | | ✓ | Client Components only |
| `config/env.ts` → `clientEnv` | ✓ | ✓ | Inlined at build |
| `config/env.ts` → `serverEnv()` | ✓ | throws | Use only from a `server-only` module |

When an authenticated upstream is needed, the one sanctioned extension is
`src/lib/api/instances.server.ts` (starting with `import 'server-only'`, holding a
second `createApiClient`) with server-only resource functions next to it.

## Caching

Two layers, aligned at 60 seconds:

- **Next data cache** (server): `next: { revalidate: 60, tags }` per read.
  Tags (`users`, `user:<id>`) are in place for `revalidateTag`, but nothing
  calls it yet.
- **TanStack Query cache** (browser): `staleTime` 60 s, `gcTime` 5 min, no refetch
  on window focus. Invalidation is owned by mutation factories.

There is no shared cache in front of browser reads. Each viewer hits the upstream.

## Testing

Tests live next to their source (`*.test.ts[x]`) and run in jsdom. They stub at
the `api` seam (`vi.mock('@/lib/api/instances', …)`) with raw upstream payloads,
never at global `fetch`. The one exception is `client.test.ts`, which tests the
wrapper itself. Covered today: the client, resource module, `parseOrThrow`, the
query client/provider/factories, the three `users` Client Components, and
`Spinner`.

## Folder map

```
.
├── AGENTS.md, CLAUDE.md        agent rules (CLAUDE.md = invariants + workflow)
├── ARCHITECTURE.md             this file
├── README.md                   setup, scripts, conventions, Vercel deploy
├── vercel.json                 install/build commands, branch gating
├── next.config.ts              build tuning (no source maps, SKIP_TYPECHECK)
├── pnpm-workspace.yaml         allowBuilds decisions for dependency scripts
├── .claude/                    agent config (enabled plugins)
├── docs/
│   └── superpowers/
│       ├── specs/              design specs (+ TEMPLATE.md)
│       └── plans/              implementation plans (+ TEMPLATE.md)
├── scripts/                    new-spec.sh, new-plan.sh, vercel-ignore-build.sh
├── public/
└── src/
    ├── app/                    routes only
    │   ├── (marketing)/        / and its layout
    │   └── dashboard/          page, layout, loading, error
    ├── components/
    │   ├── ui/                 primitives
    │   └── features/users/     reference feature
    ├── config/                 env.ts, constants.ts
    ├── lib/
    │   ├── api/                client, errors, instances, <resource>
    │   ├── queries/            QueryClient, provider, <resource> factories
    │   ├── validators/         zod schemas, parseOrThrow
    │   ├── hooks/              useDebounce
    │   └── utils/              cn, format
    ├── test/                   renderWithQuery
    └── types/                  z.infer types, ApiErrorBody, Paginated<T>
```

## Extending

- **New resource:** the four files listed in `CLAUDE.md` (validator → type →
  `lib/api/<name>.ts` → `lib/queries/<name>.ts`), then a feature folder under
  `components/features/`.
- **Architectural change:** spec in `docs/superpowers/specs/`, then a plan, per the
  workflow in `CLAUDE.md`.

## Known gaps

- `users` is a placeholder and should be removed once a real resource exists.
- Unused scaffolding: `Paginated<T>`, `ApiError.toBody()` / `ApiError.from()`,
  `formatDate`, `truncate`.
- No cache tag is ever revalidated.
- `dashboard/error.tsx` logs to the console. Error reporting isn't wired up.
