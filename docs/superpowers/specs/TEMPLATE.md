# <Topic> Design

> Produced by `superpowers:brainstorming` (architectural path). Once this
> document is `Approved`, the only next skill is `superpowers:writing-plans`.
> File naming: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`.

| | |
|---|---|
| **Status** | `Draft` |
| **Created** | YYYY-MM-DD |
| **Updated** | YYYY-MM-DD |
| **Owner** | <human partner> |
| **Plan** | `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` (once written) |
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

<Two or three sentences: what this builds and why it is worth building. If a
reader stops here, this is what they should walk away knowing.>

## Context

<Current state in this repo — the flow being changed or the gap being filled.
Name the files. Link recent commits if relevant. What forces this now?>

## Non-goals

YAGNI, explicitly. Each line is something a reader might reasonably assume is
in scope, that is not.

- <thing we are deliberately not building>
- <thing deferred to a later spec, with a note on what would trigger it>

## Success criteria

Observable outcomes, not activities. Each should be checkable by someone who
did not write the code.

- [ ] <a user- or caller-visible behavior that exists afterward>
- [ ] <a verification that passes: exact command and expected result>

---

## Approaches considered

Lead with the recommendation and say why. Two or three options; if there was
genuinely only one viable approach, say so and explain what rules the others out.

### Recommended: <name>

<What it is, in a few sentences.>

**Why:** <the reasoning that made this the pick>
**Costs:** <what we accept by choosing it>

### Alternative: <name>

<What it is.> **Rejected because:** <reason>

### Alternative: <name>

<What it is.> **Rejected because:** <reason>

---

## Design

Scale each subsection to its complexity — a few sentences when straightforward,
a few hundred words when genuinely nuanced. Delete subsections that do not apply
rather than filling them with "n/a".

### Architecture

<How the pieces fit. How this sits against the invariants in `CLAUDE.md` — if it
bends one, say which and justify it here, because a reviewer will otherwise
reject it as a defect.>

### Components

One entry per unit. A unit that cannot answer all three lines needs better
boundaries before this spec is approved.

**`<path/to/unit.ts>`**
- **Does:** <one clear purpose>
- **Used as:** <the interface consumers see — exact exported names and signatures>
- **Depends on:** <its inputs and collaborators>

### Data flow

<Trace one real request or interaction end to end, naming the modules it passes
through. For this repo that usually means one of:>

```
Server Component  ─►  <resource>Api.<op>()  ─►  api  ─►  upstream
Client Component  ─►  useQuery(<resource>Queries.<op>())  ─►  <resource>Api.<op>()  ─►  api  ─►  upstream
```

### Interfaces and contracts

Concrete shapes, not descriptions. These become the plan's `Produces` blocks, so
a wrong name here propagates into every task.

```ts
// src/lib/validators/<name>.ts
export const <name>Schema = z.object({ /* … */ });

// src/lib/api/<name>.ts
export const <name>Api = {
  list(options: { page?: number; pageSize?: number }): Promise<<Name>[]>;
};
```

<Any new payload shape, as the zod schema the resource function parses it
with. Resource functions return the payload unwrapped.>

### Error handling

<Which failures are expected, what status and `code` each maps to, and who
surfaces them. Name the boundary: `ApiError` thrown in `lib/api` (422 via
`parseOrThrow`) → rendered by `error.tsx` or the query's `error` field.>

| Failure | Status | `code` | Surfaced as |
|---|---|---|---|
| <invalid input> | 422 | `validation_error` | field messages on the form |
| <upstream down> | 503 | `network_error` | <what the user sees> |

### Testing

<What proves this works, and at which level. Name the specific behaviors worth a
test — not "unit tests for the module". If this needs a test runner the repo
does not yet have, say so: the plan will add it as its own task.>

---

## Global Constraints

Project-wide requirements with exact values. The implementation plan copies this
section **verbatim** into its own Global Constraints, so state values here rather
than describing them.

- Verification gate: `npm run typecheck && npm run lint && npm run build` passes
  with fresh output before any task is claimed complete.
- The architecture invariants in `CLAUDE.md` are binding.
- <version floors, dependency limits, naming and copy rules, platform requirements>

## Open questions

Must be empty before **Status** becomes `Approved`. An open question left here is
an ambiguity the executor will have to rule on without you.

- [ ] <question> — <who decides, and by when>

## Decision Log

Append-only. Records what was settled and what it would cost to be wrong.

| Date | Decision | Why | Cost if wrong |
|---|---|---|---|
| YYYY-MM-DD | <what was decided> | <reasoning> | <what rework it implies> |

---

## Before marking this spec In Review

Run this yourself with fresh eyes — it is a checklist, not a subagent dispatch.

- [ ] **Placeholder scan** — no `<...>`, `TBD`, `TODO`, empty sections, or vague
      requirements ("appropriate error handling", "handle edge cases").
- [ ] **Internal consistency** — no section contradicts another; the
      architecture matches the component list and the data flow.
- [ ] **Scope check** — this is one implementation plan's worth of work. If it
      describes multiple independent subsystems, decompose it: each sub-project
      gets its own spec → plan → implementation cycle, and this document becomes
      the first of them.
- [ ] **Ambiguity check** — no requirement can be read two ways. Where one
      could, pick a reading and make it explicit.
- [ ] **Status block filled** — Status, Created, Updated, Owner.

Then hand off:

> "Spec written and committed to `<path>`. Please review it and let me know if
> you want any changes before I write the implementation plan."

On approval, set **Status** to `Approved` and invoke `superpowers:writing-plans`.
