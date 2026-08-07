---
name: workflow
description: alfred's master delivery pipeline — the ordered, gated workflow (idea → spec → human approval → ticket → implement+tests → regression → review → docs → PR), the workflow-state file procedure, and the per-role sub-agent dispatch brief templates. Load at the start of every task and whenever deciding the next step.
---

# workflow — alfred's gated delivery pipeline

This is alfred's operating procedure. alfred enforces a fixed order and never
lets a task jump a gate. alfred runs stages 0–2 itself (idea, spec, human
approval) and delegates stages 3–7 to FIVE dedicated Claude Code sub-agents —
one per stage. The human approves the spec (stage 2) and merges the PR
(stage 8).

## The five dedicated sub-agents

| Agent | Stage | Skill | Writes? |
|-------|-------|-------|---------|
| `ticket_agent`  | 3 TICKET | `to-tickets` | creates the issue only |
| `coding_agent`  | 4 IMPLEMENTATION + TESTS | `implement` (+ `tdd` seam) | product code + tests; opens ONE PR |
| `testing_agent` | 5 REGRESSION | `qa` | **read-only** (hard no-edit) |
| `review_agent`  | 6 REVIEW | `code-review` | **read-only** (hard no-edit) |
| `doc_agent`     | 7 DOCS + RELEASE NOTES | — | docs onto the existing PR branch |

The step skills are delivered to each sub-agent through the target project's
committed `.claude/skills/` (set up via setup-matt-pocock-skills), not bundled
per agent. alfred bundles and runs `grill-me`, `to-spec`, and `workflow` itself.

## Two hard rules

1. No IMPLEMENTATION without a **human-approved spec**.
2. No implementation without a **linked ticket** (GitHub or GitLab issue).

A policy backstops both: any dispatch to a **repo-writing** agent (`coding_agent`
or `doc_agent`) whose brief omits the `SPEC-APPROVED:` and `Ticket:` lines is
escalated to the human as an ASK with a warning. The human can approve to
override — always log overrides. `ticket_agent` (which creates the ticket) and
the read-only `testing_agent` / `review_agent` are not gated.

## The pipeline

| # | Stage | Owner | Skill | Definition of Done |
|---|-------|-------|-------|--------------------|
| 0 | IDEA | alfred | `grill-me` | Problem, scope, success criteria written down |
| 1 | SPEC | alfred | `to-spec` | Spec doc with acceptance criteria (ACs) exists |
| 2 | HUMAN SPEC APPROVAL | 🧍 human | — | Human explicitly approves; who/when recorded |
| 3 | TICKET | `ticket_agent` (implement) | `to-tickets` | Issue created with ACs + labels; URL recorded |
| 4 | IMPLEMENTATION + TESTS | `coding_agent` (implement) | `implement` (+ `tdd`) | Change done, own tests green, branch pushed, PR opened |
| 5 | TESTS GREEN / REGRESSION | `testing_agent` (review) | `qa` | Full suite green, no regressions |
| 6 | REVIEW | `review_agent` (review) | `code-review` | Change reviewed against ACs; blocking issues cleared |
| 7 | DECISION DOCS + RELEASE NOTES | `doc_agent` (implement) | — | Decisions documented (ADR) + release notes on the PR |
| 8 | PR / MERGE | 🧍 human | — | Human merges. alfred never merges |

Stages 0–2 are sequential and human-gated. Stages 3–7 each end by updating the
state file. A failure at 5 or 6 routes fix-tasks back to stage 4 (same ticket,
same branch, `coding_agent`), then re-runs 5–6.

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

### Stage 3 — TICKET (delegate: `ticket_agent`, implement, `to-tickets`)
Dispatch `ticket_agent` to create ONE issue in the project's tracker with the
ACs and appropriate labels. Record `issue_url` and set `stage = "ticketed"`.

### Stage 4 — IMPLEMENTATION + TESTS (delegate: `coding_agent`, implement, `implement`)
Create a git worktree + task branch. Dispatch `coding_agent` to implement the
ticket with the `implement` skill (dropping into `tdd` at the code seams) — the
coding agent writes the unit tests. It drives to green, pushes, and opens ONE
PR. Record `branch`, `pr_url`; set `stage = "implementing"` → `"tests"` when the
PR is open.

### Stage 5 — REGRESSION (delegate: `testing_agent`, review, `qa`)
Dispatch `testing_agent` to run the FULL suite with `qa` and check for
regressions. It is read-only (cannot edit code). If green: `tests_green = true`,
`stage = "review"`. If red: create fix-tasks, route back to stage 4.

### Stage 6 — REVIEW (delegate: `review_agent`, review, `code-review`)
Give `review_agent` the WORKTREE + branch from stage 4 and the acceptance
contract (spec ACs + ticket). It runs the `code-review` skill over the change's
diff against its base, judged additionally against the ACs. It stays read-only
(cannot edit, cannot apply `--fix`, cannot open/push a PR). Blocking issues →
fix-tasks back to stage 4. When clean: `reviewed = true`, `stage = "docs"`.
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
      "tests_green": false,
      "reviewed": false,
      "documented": false,
      "overrides": []
    }
  ]
}
```

`stage` ∈ `idea | spec | spec_approved | ticketed | implementing | tests |
review | docs | pr | done`.

## Dispatch brief templates

Every brief to a **repo-writing** agent (`coding_agent`, `doc_agent`) MUST start
with the two gate lines (the policy checks them; the gate ASKs without them):

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
- One PR per ticket: `coding_agent` opens it, `doc_agent` commits onto it.
- Log every human override with a warning note in `overrides`.
- Supervise via the inbox; end the turn while workers run.
