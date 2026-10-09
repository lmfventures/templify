@AGENTS.md

# Templify

Minimal Next.js App Router boilerplate: thin routes, one typed REST client shared
by Server Components and the browser, zod-validated boundaries. Read this before touching code — a fresh subagent
gets no other context.

## Commands

| Purpose | Command | Notes |
|---|---|---|
| Dev server | `npm run dev` | Turbopack, port 3000 |
| Typecheck | `npm run typecheck` | `tsc --noEmit` |
| Test | `npm test` | Vitest + Testing Library, jsdom; `npm run test:watch` to iterate |
| Lint | `npm run lint` | flat config; React Compiler rules are ERRORS |
| Build | `npm run build` | runs typecheck + prerender |

**Verification gate.** Per `superpowers:verification-before-completion`, no
completion claim without fresh output from `npm run typecheck && npm run lint &&
npm run build && npm test` in the *current* message.

## Architecture invariants

Break one of these and the review will reject the task.

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
   resource module or Client Component may import that module. A project that
   needs an authenticated upstream adds `src/lib/api/instances.server.ts` (a second
   `createApiClient`, `server-only` first line) plus server-only resource
   functions beside it — the one sanctioned exception to "one configured client"
   in invariant 1.
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
- `NEXT_PUBLIC_API_BASE_URL` is inlined at `next build`, on the server too, so the
  upstream is fixed per build. A build promoted across environments keeps the
  URL it was built with — rebuild per environment.

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

### Layout

```
src/app/        routes only — (marketing) group, dashboard/
src/components/ ui/ = dumb primitives · features/<feature>/ = composed
src/lib/        api/ (client + resources) · queries/ (TanStack) · hooks/ · utils/ · validators/
src/types/      shared types, inferred from validators
src/config/     env.ts (zod-parsed at load) · constants.ts
src/test/       test helpers (render-with-query)
```

## Repo gotchas

- **Next 16 / React 19.** Route `params` and `searchParams` are Promises — await
  them. The `react-hooks` compiler rules are errors, not warnings: no ref writes
  during render, no `setState` in an effect body.
  See `src/lib/hooks/use-debounce.ts` for the pattern that satisfies them
  (state synced from an effect with a cleanup, never written during render).
- **No root `src/app/page.tsx`.** `/` is served by `src/app/(marketing)/page.tsx`.
  Adding both is a route collision. After deleting a page, `rm -rf .next` or
  stale `.next/types` will fail the typecheck.
- **Env fails fast.** `src/config/env.ts` parses at module load. Add a var to the
  schema *and* `.env.example` in the same commit.
- **`NEXT_PUBLIC_API_BASE_URL`** defaults to jsonplaceholder so the repo runs with
  no setup. The `users` resource is a reference example — delete it once real
  ones exist.
- **No `clsx`/`tailwind-merge`.** `cn()` is a plain joiner; it does not resolve
  Tailwind conflicts. Order classes so the last one wins, or add the deps in a
  task of their own.
- **TanStack Query is client-only here.** `QueryProvider` is mounted in the root
  layout; Server Components still `await` `lib/api` functions directly. There is
  no `HydrationBoundary`, so a client section shows its loading state on first
  paint — that is deliberate, not a bug. Tests stub at the `api` seam
  (`vi.mock('@/lib/api/instances', () => ({ api: { get, post, … } }))`), with
  mocks resolving to raw upstream payloads, never at global `fetch`; the one
  exception is `src/lib/api/client.test.ts`, which tests the wrapper itself.

## Superpowers workflow (local)

Skills are mandatory, not advisory: if one plausibly applies, invoke it and
announce it. Process skills set the approach before implementation skills run.

```
request → brainstorming ──(bounded)──→ design in chat → APPROVAL → implement
                        └─(architectural)→ docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md
                                         → writing-plans
                                         → docs/superpowers/plans/YYYY-MM-DD-<feature>.md
                                         → using-git-worktrees
                                         → subagent-driven-development (preferred)
                                            or executing-plans
                                         → requesting-code-review
                                         → verification-before-completion
                                         → finishing-a-development-branch
```

**The approval gate is absolute.** No code, no scaffolding, no file writes for
new behavior until the human partner approves stated intent — however small the
change. Bugs go to `systematic-debugging` first, not to a fix.

### Where things live

| Artifact | Path | Committed |
|---|---|---|
| Spec (architectural work only) | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` | yes |
| Plan | `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` | yes |
| Spec / plan templates | `docs/superpowers/specs/TEMPLATE.md` · `docs/superpowers/plans/TEMPLATE.md` | yes |
| SDD ledger, briefs, review packages | `.superpowers/sdd/<plan-basename>/` | no (git-ignored) |

Start either from its template — both stamp today's date into the filename and
the status header:

```bash
./scripts/new-spec.sh <topic>          # docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md
./scripts/new-plan.sh <feature-name>   # docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md
```

The spec is the binding authority during execution: where a plan and its spec
disagree, the spec wins. A plan with no reachable spec makes every ruling
provisional — note that in the ledger.

### Executing a plan

- Work in a worktree, never on `main` without explicit consent.
- The ledger at `.superpowers/sdd/<plan-basename>/progress.md` outranks your
  memory after a compaction. A task with a `Task <N>: complete` line is done —
  resume at the first task without one.
- Keep the plan file itself current: tick `- [ ]` → `- [x]` as steps land, and
  update the plan's **Status** and **Updated** fields plus the task's row in the
  progress table. The plan is the human-readable status board; the ledger is the
  recovery map. Both, not one.
- Decide, don't stall. Record `Ruling: <decision> — <why> — <cost if wrong>` in
  the ledger and keep going. Only four things stop execution: an irreversible or
  destructive operation, a security-sensitive action, a side effect outside the
  worktree (merge, push to a shared branch, publish), or a plan so broken every
  path forward is a guess.

## Commits

Conventional prefixes (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`). Commit
at each plan step boundary — small and frequent. No `Co-Authored-By: Claude`
trailer and no Claude Code attribution line in PR descriptions.
