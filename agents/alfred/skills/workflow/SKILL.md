---
name: workflow
description: alfred's master delivery pipeline — the ordered, gated workflow (idea → spec → human approval → ticket → implement+tests → opt-in visual design → regression → review → docs → PR), the workflow-state file procedure, and the per-role sub-agent dispatch brief templates. Load at the start of every task and whenever deciding the next step.
---

# workflow — alfred's gated delivery pipeline

This is alfred's operating procedure. alfred enforces a fixed order and never
lets a task jump a gate. alfred runs stages 0–2 itself (idea, spec, human
approval) and delegates stages 3–7 to SIX dedicated Claude Code sub-agents.
The human approves the spec (stage 2) and merges the PR (stage 8).

## The six dedicated sub-agents

| Agent | Stage | Skill | Writes? |
|-------|-------|-------|---------|
| `ticket_agent`  | 3 TICKET | `to-tickets` | creates the issue only |
| `coding_agent`  | 4 IMPLEMENTATION + TESTS | `implement` (+ `tdd` seam) | product code + tests; opens ONE PR |
| `design_agent`  | 4b VISUAL DESIGN — **opt-in** | `frontend-design` | presentation only; onto the existing PR |
| `testing_agent` | 5 REGRESSION | `qa` | **read-only** (hard no-edit) |
| `review_agent`  | 6 REVIEW | `code-review` | **read-only** (hard no-edit) |
| `doc_agent`     | 7 DOCS + RELEASE NOTES | — | docs onto the existing PR branch |

The step skills are delivered to each sub-agent through the target project's
committed `.claude/skills/` (set up via setup-matt-pocock-skills), not bundled
per agent. alfred bundles and runs `grill-me`, `to-spec`, and `workflow` itself.
One exception: `frontend-design` is bundled inside the `design_agent` bundle, so
that agent has it regardless of what the target project ships.

## Two hard rules

1. No IMPLEMENTATION without a **human-approved spec**.
2. No implementation without a **linked ticket** (GitHub or GitLab issue).

A policy backstops both: any dispatch to a **repo-writing** agent
(`coding_agent`, `design_agent`, or `doc_agent`) whose brief omits the
`SPEC-APPROVED:` and `Ticket:` lines is escalated to the human as an ASK with a
warning. The human can approve to override — always log overrides.
`ticket_agent` (which creates the ticket) and the read-only `testing_agent` /
`review_agent` are not gated.

## The pipeline

| # | Stage | Owner | Skill | Definition of Done |
|---|-------|-------|-------|--------------------|
| 0 | IDEA | alfred | `grill-me` | Problem, scope, success criteria written down |
| 1 | SPEC | alfred | `to-spec` | Spec doc with acceptance criteria (ACs) exists |
| 2 | HUMAN SPEC APPROVAL | 🧍 human | — | Human explicitly approves; who/when recorded; design yes/no answered |
| 3 | TICKET | `ticket_agent` (implement) | `to-tickets` | Issue created with ACs + labels; URL recorded |
| 4 | IMPLEMENTATION + TESTS | `coding_agent` (implement) | `implement` (+ `tdd`) | Change done, own tests green, branch pushed, PR opened |
| 4b | VISUAL DESIGN — **only if `design == true`** | `design_agent` (implement) | `frontend-design` | Design on the existing PR branch; suite as green as before; no logic touched |
| 5 | TESTS GREEN / REGRESSION | `testing_agent` (review) | `qa` | Full suite green, no regressions |
| 6 | REVIEW | `review_agent` (review) | `code-review` | Change reviewed against ACs; blocking issues cleared |
| 7 | DECISION DOCS + RELEASE NOTES | `doc_agent` (implement) | — | Decisions documented (ADR) + release notes on the PR |
| 8 | PR / MERGE | 🧍 human | — | Human merges. alfred never merges |

Stages 0–2 are sequential and human-gated. Stages 3–7 each end by updating the
state file. **Stage 4b is skipped by default** — it runs only on an explicit yes
(see below). A failure at 5 or 6 routes fix-tasks back to stage 4 (same ticket,
same branch, `coding_agent`) — or back to 4b when the issue is purely
presentational — then re-runs 5–6.

## Procedure

### Start of every turn
1. Read `.omnigent/workflow-state.json` (create it if missing — see schema).
2. Find the active task and its `stage`. The next action is the next stage whose
   DoD is unmet. Never skip.
3. Do that stage's work (run a skill yourself, or dispatch the stage's agent).
4. Update the task's stage/flags in the state file when the DoD is met.

### Stage 0 — IDEA (alfred)
Load `grill-me` and interview the human until the problem, scope, and success
criteria are clear. Write the outcome into the task entry (`title`, notes).

### Stage 1 — SPEC (alfred)
Load `to-spec` (explicit load required — `disable-model-invocation`). Synthesize
the conversation into a spec with explicit ACs. If the skill publishes the spec
to the tracker, record `spec_url`; otherwise save the spec as a doc and record
its path in `spec_url`.

### Stage 2 — HUMAN SPEC APPROVAL (hard human gate)
Present the spec to the human and ask plainly: "Approve this spec? (yes / change
/ override)". Do NOT advance until they answer.
- Approved → set `spec_approved = {by, at}` and `stage = "spec_approved"`.
- Override ("skip"/"proceed anyway") → append to `overrides` a
  `{stage, reason, warning, by, at}` entry and continue, having WARNED the human
  that the hard rule is being bypassed.

**Ask the design question in the same message** (this is the opt-in that governs
stage 4b):

> Should this change get a visual design pass afterwards? (yes / no)
> — yes runs `design_agent` over the finished UI with the `frontend-design`
> skill: styling, layout, and typography only, no logic or user-flow changes.

Record the answer as `design` on the task. **`false` is the default.** A silent
or ambiguous answer is a no. Never set it to `true` because a ticket sounds
visual, and never set it yourself.

### Stage 3 — TICKET (delegate: `ticket_agent`, implement, `to-tickets`)
Dispatch `ticket_agent` to create ONE issue in the project's tracker with the
ACs and appropriate labels. Record `issue_url` and set `stage = "ticketed"`.

### Stage 4 — IMPLEMENTATION + TESTS (delegate: `coding_agent`, implement, `implement`)
Create a git worktree + task branch. Dispatch `coding_agent` to implement the
ticket with the `implement` skill (dropping into `tdd` at the code seams) — the
coding agent writes the unit tests. It drives to green, pushes, and opens ONE
PR. Record `branch`, `pr_url`; set `stage = "implementing"` → `"tests"` when the
PR is open.

### Stage 4b — VISUAL DESIGN (delegate: `design_agent`, implement, `frontend-design`)
**Opt-in. Run this stage ONLY if `design == true` on the task, or the human asks
for a design pass outright. Otherwise go straight from 4 to 5 and do not mention
it again.**

Dispatch `design_agent` with `Mode: polish` and the stage-4 `branch`. It lays a
visual design over the UI the coding agent just built, committing onto the
EXISTING PR branch — no second PR. It changes presentation only (styles, design
tokens, markup for layout, static assets) and never logic, data flow, routing,
user flows, or tests.

Set `stage = "designing"` while it runs; on success set `design_applied = true`
and `stage = "tests"`. 4b comes BEFORE 5 and 6 on purpose, so regression and
review judge the designed code.

Two things to check in its result before advancing:
1. It reports the suite as green as it inherited it. If a test broke on a
   presentation-level selector, the design agent stops rather than editing the
   test — that judgement is yours: either accept the selector change as a
   fix-task for `coding_agent`, or send the design back.
2. Its follow-up list. Anything it left alone because it was logic becomes a new
   ticket for `coding_agent`, never a widening of the design agent's scope.

### Stage 5 — REGRESSION (delegate: `testing_agent`, review, `qa`)
Dispatch `testing_agent` to run the FULL suite with `qa` and check for
regressions. It is read-only (cannot edit code). If green: `tests_green = true`,
`stage = "review"`. If red: create fix-tasks, route back to stage 4.

### Stage 6 — REVIEW (delegate: `review_agent`, review, `code-review`)
Give `review_agent` the WORKTREE + branch from stage 4 and the acceptance
contract (spec ACs + ticket). It runs the `code-review` skill over the change's
diff against its base, judged additionally against the ACs. It stays read-only
(cannot edit, cannot apply `--fix`, cannot open/push a PR). Blocking issues →
fix-tasks back to stage 4 (or 4b if purely presentational). When clean:
`reviewed = true`, `stage = "docs"`.

If stage 4b ran, say so in the brief and add this to the contract: the design
commits must be presentation-only — no logic, data-flow, routing, or user-flow
drift, and no test weakened to accommodate new markup. This review is the
enforcement backstop for the design agent's one hard rule, which is otherwise
prompt-level only.
> Same-vendor caveat: reviewer is Claude Code, same vendor as the coding agent —
> not independent cross-vendor review. Use a fresh session and a different model
> if available. To restore independence, add another vendor to `tools.agents`
> and point stage 6 at it.

### Stage 7 — DECISION DOCS + RELEASE NOTES (delegate: `doc_agent`, implement)
Dispatch `doc_agent` to write/append an ADR capturing the key decisions and to
prepare release notes, committed onto the EXISTING PR branch from stage 4 (one PR
per ticket — the doc agent does NOT open a new PR). Pass it the `branch`. Set
`documented = true`, `stage = "pr"`.

### Stage 8 — PR / MERGE (human)
Tell the human the PR is ready for review and merge, with the PR URL. alfred
never merges.

## Standalone design run

A human may ask for a design pass over UI that ALREADY EXISTS — shipped by an
earlier `coding_agent` run, or already on main. This is a task of its own, not a
pipeline skip, so it still walks the gates:

1. Stages 0–2 as normal. The "spec" here is the design brief: what the UI is,
   who it is for, the aesthetic direction or constraints, and ACs that are
   visual (plus the standing AC "no behaviour changes"). Get it approved.
2. Stage 3 — `ticket_agent` creates the ticket as usual.
3. Instead of stage 4: create a worktree + branch off the current code and
   dispatch `design_agent` with `Mode: standalone`. It designs, pushes, and
   opens its OWN PR. Set `design_standalone = true`, `design = true`,
   `design_applied = true`, `branch`, `pr_url`.
4. Stages 5–7 run over that PR exactly as normal, then the human merges.

If what the human actually wants needs logic or user-flow changes, that is not a
design task — say so and route it through the normal stage 4 with
`coding_agent`. The design agent is not a shortcut around the pipeline.

## Workflow-state file schema

Path: `.omnigent/workflow-state.json` (create the `.omnigent/` dir if needed).

```json
{
  "version": 1,
  "tasks": [
    {
      "id": "login-sso",
      "title": "SSO login for the portal",
      "stage": "spec_approved",
      "spec_url": "https://.../issues/41 or docs/specs/login-sso.md",
      "spec_approved": { "by": "ingo", "at": "2026-07-17T10:00:00Z" },
      "issue_url": null,
      "branch": null,
      "pr_url": null,
      "design": false,
      "design_applied": false,
      "design_standalone": false,
      "tests_green": false,
      "reviewed": false,
      "documented": false,
      "overrides": []
    }
  ]
}
```

`stage` ∈ `idea | spec | spec_approved | ticketed | implementing | designing |
tests | review | docs | pr | done`.

`design` is the human's explicit yes/no from stage 2 — it gates stage 4b and
defaults to `false`. `design_applied` records that 4b actually ran.
`design_standalone` marks a design-only task where no `coding_agent` stage 4 ran.

## Dispatch brief templates

Every brief to a **repo-writing** agent (`coding_agent`, `design_agent`,
`doc_agent`) MUST start with the two gate lines (the policy checks them; the gate
ASKs without them):

```
SPEC-APPROVED: <spec-url> — approved by <name> on <date>
Ticket: <issue-url>
```

**Ticket (stage 3) — agent: `ticket_agent`, purpose: implement, title `create-ticket-<slug>`**
```
Task: Load the `to-tickets` skill and create ONE issue in this project's tracker
(GitHub or GitLab — detect from the repo/remotes) from the spec below. Include
the acceptance criteria as a checklist and apply the appropriate labels. Return
the issue URL.
SPEC-APPROVED: <spec-url> — approved by <name> on <date>
Spec / ACs:
<paste spec + ACs>
```
(ticket_agent is not gated — the `Ticket:` line does not exist yet because this
is the step that creates it. No ASK is expected here.)

**Implementation + tests (stage 4) — agent: `coding_agent`, purpose: implement, title `implement-<slug>`**
```
SPEC-APPROVED: <spec-url> — approved by <name> on <date>
Ticket: <issue-url>
Task: Implement the ticket using the `implement` skill (drop into `tdd` at the
code seams). Write the unit tests yourself. Stay within <scoped files>. Drive to
green (tests + lint + typecheck for what you touched), push the branch, and open
ONE PR.
Acceptance contract (spec ACs):
<paste ACs>
Worktree/branch: <path> / <branch>
```

**Visual design (stage 4b, polish) — agent: `design_agent`, purpose: implement, title `design-<slug>`**
Only send this when `design == true`.
```
SPEC-APPROVED: <spec-url> — approved by <name> on <date>
Ticket: <issue-url>
Mode: polish
Worktree/branch: <path> / <branch>   (the stage-4 PR branch — commit onto it, no new PR)
Task: Lay a visual design over the UI on this branch using the `frontend-design`
skill (bundled with you). PRESENTATION ONLY: styles, design tokens, markup in the
service of layout, static assets. Do NOT change logic, state, data fetching,
routing, form behaviour, or user flows — the screens, their order, and what every
control does must come out identical. Do NOT edit or delete tests to fit new
markup; if a test breaks on a selector, STOP and report it. Keep semantics,
focus order, labels/ARIA, and WCAG AA contrast intact. Run the project's lint,
typecheck, and the affected tests: the suite must be as green as you found it.
Design brief / direction:
<the aesthetic direction, brand constraints, reference material, or "your call">
Scope: <the UI files/components in play>
Acceptance contract (spec ACs — behaviour must still satisfy these):
<paste ACs>
```

**Visual design (standalone) — agent: `design_agent`, purpose: implement, title `design-<slug>`**
Same as above, but `Mode: standalone`, a fresh branch off the current code, and:
```
Mode: standalone
Branch: <new branch off main/current>   (push it and open ONE PR yourself)
```

**Regression (stage 5) — agent: `testing_agent`, purpose: review, title `regression-<slug>`**
```
Ticket: <issue-url>
Branch under test: <branch>
Task: Run the FULL test suite using the `qa` skill and report regressions. You
are read-only — do NOT edit anything. Return: suite result, any failures with
file:line, and a regression verdict.
```

**Review (stage 6) — agent: `review_agent`, purpose: review, title `review-<slug>`**
```
Ticket: <issue-url>
Worktree/branch: <path> / <branch>
Task: Review the change on this branch using the `code-review` skill (it diffs
the branch against its base). You are read-only — do not edit code, do not use
`--fix`, do not open/push a PR. Judge it against the acceptance contract below as
well. Report blocking issues, non-blocking issues, and suggestions separately
with file:line evidence, then a verdict (PASS / CHANGES-REQUESTED).
Acceptance contract (spec ACs):
<paste ACs>
```
Add this line when stage 4b ran:
```
A design pass (design_agent) also ran on this branch. Additionally verify that
its commits are PRESENTATION-ONLY: no logic, state, data-flow, routing, or
user-flow changes, and no test weakened or deleted to accommodate new markup.
Treat any such change as BLOCKING.
```

**Docs + release notes (stage 7) — agent: `doc_agent`, purpose: implement, title `docs-<slug>`**
```
SPEC-APPROVED: <spec-url> — approved by <name> on <date>
Ticket: <issue-url>
Task: Document the key decisions for this change (add/append an ADR under
docs/adr/) and prepare release notes for it. Check out the EXISTING PR branch
<branch> and commit onto it — do NOT open a new PR and do NOT change product
code.
Decisions to capture:
<the notable choices made during 0–6>
```

## Reminders

- alfred never writes code/tests and never merges.
- `review_agent` gets the worktree/branch (runs `code-review`); `testing_agent`
  gets the branch to run the suite; both are hard-locked read-only.
- One PR per ticket: `coding_agent` opens it, `design_agent` (polish mode) and
  `doc_agent` commit onto it. Only a standalone design run opens its own PR.
- `design_agent` is OPT-IN: no explicit yes, no stage 4b. It is the only
  optional stage in the pipeline.
- `design_agent` changes how things look, never what they do. Anything it
  flagged as logic becomes a `coding_agent` ticket, not a wider design scope.
- Log every human override with a warning note in `overrides`.
- Supervise via the inbox; end the turn while workers run.
