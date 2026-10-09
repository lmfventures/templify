# <Feature Name> Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

| | |
|---|---|
| **Status** | `Draft` |
| **Created** | YYYY-MM-DD |
| **Updated** | YYYY-MM-DD |
| **Owner** | <human partner> |
| **Branch / worktree** | `<branch-name>` — created via `superpowers:using-git-worktrees` |
| **Spec** | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` (or `n/a — bounded change`) |
| **Ledger** | `.superpowers/sdd/<this-plan-basename>/progress.md` |

**Status values:** `Draft` → `Approved` → `In Progress` → `Complete`.
Off-ramps: `Blocked` (say what unblocks it in Decision Log) · `Abandoned`.

Update **Status**, **Updated**, and the Progress table as work lands. Whoever
executes this plan owns keeping it accurate — a stale plan misleads the next
session more than no plan at all.

**Goal:** <one sentence describing what this builds>

**Architecture:** <2-3 sentences on the approach and why>

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript (strict) · zod · Tailwind v4 <+ anything new>

---

## Progress

| # | Task | Status | Started | Completed | Commit |
|---|---|---|---|---|---|
| 1 | <task name> | ⬜ Not started | — | — | — |
| 2 | <task name> | ⬜ Not started | — | — | — |
| 3 | <task name> | ⬜ Not started | — | — | — |

Legend: ⬜ Not started · 🔄 In progress · 🔁 Fix round *R*/5 · ✅ Complete · ⛔ Blocked · ⏭️ Descoped

---

## Global Constraints

Project-wide requirements, exact values copied verbatim from the spec. Every
task's requirements implicitly include this section.

- Verification gate: `pnpm typecheck && pnpm lint && pnpm build` must
  pass, with fresh output, before any task is claimed complete.
- Architecture invariants in `CLAUDE.md` are binding — in particular: only
  `src/lib/api/client.ts` performs HTTP; `src/lib/api/<name>.ts` owns the upstream
  wire and carries no secrets; shared types are inferred from zod schemas, never hand-written.
- `react-hooks` compiler rules are lint errors: no ref writes during render, no
  `setState` in an effect body.
- <version floors, dependency limits, naming and copy rules, platform requirements>

---

## File Structure

What each file is responsible for. Decomposition decisions get locked in here.

**Create**
- `src/lib/validators/<name>.ts` — <responsibility>
- `src/lib/api/<name>.ts` — <responsibility>

**Modify**
- `src/types/index.ts` — re-export the new types
- `<path>:<line-range>` — <what changes>

**Test**
- `src/lib/api/<name>.test.ts` — <what it proves>

---

## Task 1: <Component Name>

**Status:** ⬜ Not started · **Started:** — · **Completed:** —

**Files:**
- Create: `src/lib/validators/<name>.ts`
- Modify: `src/types/index.ts`
- Test: `src/lib/validators/<name>.test.ts`

**Interfaces:**
- Consumes: <exact signatures this task uses from earlier tasks>
- Produces: <exact exported names, parameter and return types later tasks rely on>

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { <schema> } from './<name>';

describe('<schema>', () => {
  it('rejects <specific invalid input>', () => {
    const result = <schema>.safeParse({ <field>: <invalid> });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/validators/<name>.test.ts`
Expected: FAIL — `Cannot find module './<name>'`

- [ ] **Step 3: Write the minimal implementation**

```ts
import { z } from 'zod';

export const <schema> = z.object({
  <field>: z.<type>(),
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/validators/<name>.test.ts`
Expected: PASS — 1 passed

- [ ] **Step 5: Verify the repo is clean**

Run: `pnpm typecheck && pnpm lint`
Expected: exit 0, no output from eslint

- [ ] **Step 6: Commit**

```bash
git add src/lib/validators/<name>.ts src/lib/validators/<name>.test.ts src/types/index.ts
git commit -m "feat: add <name> validator"
```

---

## Task 2: <Component Name>

**Status:** ⬜ Not started · **Started:** — · **Completed:** —

<same shape as Task 1 — repeat the code, do not write "similar to Task 1">

---

## Decision Log

Rulings made during execution, and anything parked. Append-only.

| Date | Decision | Why | Cost if wrong |
|---|---|---|---|
| YYYY-MM-DD | <what was decided> | <reasoning> | <what rework it implies> |

---

## Before marking this plan Approved

Run this checklist yourself — it is not a subagent dispatch.

- [ ] **Spec coverage** — every spec requirement maps to a task. List any gaps.
- [ ] **Placeholder scan** — no `<...>`, `TBD`, `TODO`, "add error handling",
      "handle edge cases", "write tests for the above", "similar to Task N".
      Every code step contains real, runnable code.
- [ ] **Type consistency** — names and signatures produced in early tasks match
      what later tasks consume (`clearLayers()` vs `clearFullLayers()` is a bug).
- [ ] **Right-sized tasks** — each task ends in an independently testable
      deliverable a reviewer could reject on its own.
- [ ] **Status block filled** — Status, Created, Updated, Spec, Branch.
