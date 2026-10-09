# Templify

Minimal Next.js (App Router) boilerplate with a typed API layer, zod-validated
boundaries and a folder structure that keeps routes thin.

## Getting started

**Prerequisites** — Node.js `>=20.9` (Next 16's floor; developed on 24.x) and npm.
No database, no external services: the boilerplate boots against a public
placeholder API.

```bash
git clone https://github.com/lmfventures/templify.git
cd templify
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The dashboard at `/dashboard` exercises both
data paths (Server Component and TanStack Query → typed API layer → upstream).

### Environment

`src/config/env.ts` parses `process.env` with zod **at module load**, so a
missing or malformed value fails the boot with a readable error rather than
surfacing on the first request. Copy `.env.example` and adjust:

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | no | `https://jsonplaceholder.typicode.com` | Upstream REST API, called from the browser and the server. Public — never put a secret behind it. Inlined at `next build`: rebuild to change it. |

Adding a variable means editing the schema in `src/config/env.ts` *and*
`.env.example` in the same commit — the parse is the only gate.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 (Turbopack) |
| `npm run build` | Production build; runs typecheck and prerenders |
| `npm start` | Serve a build produced by `npm run build` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest run, once (jsdom + Testing Library) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint flat config — React Compiler rules are **errors**, not warnings |
| `npm run lint:fix` | Same, with autofix |

Before calling a change done, run the full gate:

```bash
npm run typecheck && npm run lint && npm run build && npm test
```

Tests live beside what they test, as `*.test.ts` / `*.test.tsx` under `src/`.
They stub the network at the `api` seam rather than at the transport,
so the "only one HTTP client" rule holds in tests too.

### Troubleshooting

- **Typecheck fails on a page you deleted.** Stale `.next/types`. `rm -rf .next`
  and re-run.
- **Boot dies with "Invalid client environment variables".** `NEXT_PUBLIC_API_BASE_URL`
  is set but is not a valid URL — the message names it.
- **`serverEnv() was called in the browser`.** Server-only config reached a
  Client Component; move the call into a module that starts with `import 'server-only'`.

## Structure

```
src/
  app/                        # routes only — thin, no business logic
    (marketing)/              # route group: own layout, no URL segment
      layout.tsx
      page.tsx
    dashboard/
      layout.tsx  page.tsx  loading.tsx  error.tsx
    layout.tsx  not-found.tsx  globals.css
  components/
    ui/                       # dumb, reusable primitives
      button.tsx  card.tsx  input.tsx  spinner.tsx
    features/
      users/                  # feature-specific composed components
        user-card.tsx  user-list.tsx  user-search.tsx
        user-create-form.tsx  user-detail.tsx
  lib/
    api/                      # the fetch wrapper + configured clients
      client.ts               # axios wrapper (headers, timeout, zod, errors)
      errors.ts               # ApiError
      instances.ts            # api — the one configured client (server + browser)
      users.ts                # usersApi — typed functions per operation
    queries/                  # BROWSER-side data access (TanStack Query)
      client.ts               # createQueryClient — cache and retry policy
      provider.tsx            # QueryProvider, mounted in the root layout
      users.ts                # userQueries + userMutations
    hooks/                    # use-debounce
    utils/                    # cn, format
    validators/               # zod schemas + parseOrThrow
  types/                      # shared TS types (inferred from schemas)
  config/                     # env (zod-validated), constants
  test/                       # test helpers (render-with-query)
```

## The data flow

There is exactly one place that performs HTTP, and one place that owns each URL.

```
Server Component  ──────────────────────────────────►  usersApi.list()  ─►  api  ─►  upstream
Client Component  ─►  useQuery(userQueries.list())  ─►  usersApi.list()  ─►  api  ─►  upstream
```

- **`lib/api/client.ts`** — the only HTTP client in the app, an axios instance
  pinned to `adapter: 'fetch'` so Next's cache directives still apply. Adds base
  URL, headers, query serialization, JSON body handling, a request timeout, and
  turns any failure into an `ApiError` with a `status` and a stable `code`. Pass a zod
  `schema` and you get a parsed, typed result; a mismatched upstream payload
  fails as `502 invalid_response` instead of leaking through your types.
- **`lib/api/users.ts`** — one typed function per operation, used by Server
  Components and query factories alike. It owns the upstream path, param
  mapping, cache tags and input validation (`parseOrThrow` → 422 with field
  messages). Components never know any of it.
- **`lib/queries/users.ts`** — the browser's door to the data. Key and fetcher
  are declared together in one `queryOptions()` call, so a cache key can never
  drift from the function that fills it; `userMutations.create()` takes the
  `QueryClient` and invalidates `['users']` itself. Its fetchers just call
  `usersApi`.

Resource functions return the parsed payload; failures are an `ApiError`
with a `status`, a stable `code`, and — for validation — `fields`:

```jsonc
{ "message": "Invalid request body", "code": "validation_error",
  "fields": { "email": ["Enter a valid email address"] } }
```

Open `/dashboard` with the network panel open: user reads and creates go
straight to `jsonplaceholder.typicode.com`, and an invalid email never
leaves the browser.

## Conventions worth keeping

- **Routes are thin.** A `page.tsx` composes components and awaits a `lib/api`
  function. Business logic never lives under `app/`.
- **Types are inferred, not written twice.** `src/types/user.ts` derives `User`
  from `userSchema`, so the validator is the single source of truth.
- **No secrets in the client.** `api` ships to the browser. A secret lives
  behind `serverEnv()` in a `server-only` module that no resource or Client
  Component imports.
- **Env fails fast.** `src/config/env.ts` parses `process.env` with zod at
  module load, so a missing variable breaks the boot, not the first request.
- **Adding a resource** = a schema in `lib/validators/`, a type in `types/`,
  `lib/api/<resource>.ts`, and `lib/queries/<resource>.ts`. Four small files,
  always the same shape.
- **Client data goes through a query factory.** Components never call
  `api` or `usersApi` directly — they call `useQuery(userQueries.list())`. Keys are
  hierarchical (`['users'] → ['users','list'] → ['users','list',params]`), so
  invalidating the root reaches lists and details alike.

## Notes

`NEXT_PUBLIC_API_BASE_URL` defaults to `jsonplaceholder.typicode.com` so the
boilerplate runs with no setup — point it at your own API and delete the `users`
example. The upstream must allow CORS and must not need a secret — see the
Direct REST caveats in `CLAUDE.md`.

## Working in this repo with Claude Code

`CLAUDE.md` carries the architecture invariants and the local Superpowers
workflow (brainstorm → spec → plan → worktree → execute → review).

Specs live in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`.
Each has a template; start one with:

```bash
./scripts/new-spec.sh projects-resource
./scripts/new-plan.sh add-projects-resource
```

Both stamp today's date into the filename and the document's status header.

## License

MIT — see [LICENSE](LICENSE).
