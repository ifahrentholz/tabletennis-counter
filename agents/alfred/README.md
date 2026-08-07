# alfred — workflow-enforcing orchestrator

alfred is an Omnigent orchestrator agent for diva-e projects. It runs a **fixed,
gated delivery pipeline** and refuses to let work jump a gate. alfred plans and
runs the human-facing early steps itself, then delegates each downstream stage
to its **own dedicated Claude Code sub-agent**. The human approves the spec and
merges the PR — alfred never writes code, tests, or merges.

## The pipeline

```
0 IDEA            grill-me             (alfred)
1 SPEC            to-spec              (alfred)
2 APPROVAL        —                    🧍 human approves the spec  ← hard gate
3 TICKET          to-tickets           (ticket_agent  · implement)
4 IMPLEMENT+TESTS implement (+ tdd)    (coding_agent  · implement)  ← writes code + unit tests, opens ONE PR
5 REGRESSION      qa                   (testing_agent · review)     ← runs full suite, read-only
6 REVIEW          code-review          (review_agent  · review)     ← reviews the branch vs. ACs, read-only
7 DOCS+RELEASE    —                    (doc_agent     · implement)  ← ADR + release notes onto the PR
8 PR / MERGE      —                    🧍 human merges
```

## Five dedicated sub-agents

Per your decision, every workflow step (except idea/spec, which alfred runs
itself) has its **own** sub-agent — all Claude Code (`claude-native`), each with
a focused prompt, least-privilege skill, and role-appropriate guardrails:

| Agent | Stage | Skill | Guardrail |
|-------|-------|-------|-----------|
| `ticket_agent`  | 3 | `to-tickets` | standard (creates issue only) |
| `coding_agent`  | 4 | `implement` (+ `tdd`) | can write code + open PR |
| `testing_agent` | 5 | `qa` | **`read_only_os` — hard no-edit** |
| `review_agent`  | 6 | `code-review` | **`read_only_os` — hard no-edit** |
| `doc_agent`     | 7 | — | writes docs onto the existing PR |

`testing_agent` and `review_agent` are hard-locked read-only by the
`read_only_os` policy: they can read and run the test suite via shell but every
file-mutating tool is denied — role separation is enforced, not just requested.

**One PR per ticket:** `coding_agent` opens the PR; `doc_agent` checks out that
same branch and commits its ADR + release notes onto it (no second PR).

## Two hard rules (policy-backed)

1. **No implementation without a human-approved spec.**
2. **No implementation without a linked ticket** (GitHub or GitLab issue).

Enforcement is **override-with-warning**: a CEL policy (`workflow_gate`) inspects
every dispatch to a **repo-writing** agent (`coding_agent` / `doc_agent`). If its
brief is missing the `SPEC-APPROVED:` marker and/or a `Ticket:` reference, the
dispatch is escalated to the human as an **ASK** with a warning. The human may
approve to override; overrides are logged in the workflow-state file.
`ticket_agent` (which creates the ticket) and the read-only `testing_agent` /
`review_agent` are not gated — so, unlike the earlier single-worker build, there
is **no expected ASK at ticket creation**.

> Note: Omnigent policies only see the current event, not a state file, so this
> gate checks the **dispatch brief** rather than a persisted state machine. The
> ordering of stages is driven by alfred's prompt + the `workflow` skill + the
> state file below. For a hard, state-based state machine you would add a custom
> Python policy (out of scope for this config-only build).

## State — "where are we"

alfred tracks each task in `.omnigent/workflow-state.json` in the working
project (git-ignored). It reads this at the start of every turn to know the next
step and updates it after each gate. Schema and procedure live in
`skills/workflow/SKILL.md`.

## Where the step skills come from

The step skills (`to-tickets`, `implement`, `tdd`, `qa`, `code-review`) are
**not** bundled inside each sub-agent. They reach the sub-agents through the
target project's committed `.claude/skills/` — exactly what this repo
(`setup-matt-pocock-skills`) provisions for diva-e projects. alfred itself
bundles and runs `grill-me`, `to-spec`, and `workflow`.

> Requirement: the target project must have the diva-e skill set committed under
> `.claude/skills/` (run `setup-matt-pocock-skills` and commit it), so a
> sub-agent's worktree carries the skills. `tdd` and `grill-me` also exist in the
> host `~/.claude/skills/`, but `to-spec` / `to-tickets` / `qa` do not — the
> project-level set is the reliable delivery path.

## Independence caveat

By explicit choice the reviewer (`review_agent`) is also Claude Code — the same
vendor as `coding_agent` — so review is **not** independent cross-vendor
verification. To restore independence, add another vendor (e.g. `codex`,
`opencode`, or `pi`) to `tools.agents` in `config.yaml` and point `review_agent`
(and optionally `testing_agent`) at it.

## Layout

```
agents/alfred/
  config.yaml                       # orchestrator: prompt + guardrails + CEL gate
  README.md                         # this file
  agents/
    ticket_agent/config.yaml        # stage 3 — creates the issue
    coding_agent/config.yaml        # stage 4 — code + tests, opens the PR
    testing_agent/config.yaml       # stage 5 — full suite / regression (read-only)
    review_agent/config.yaml        # stage 6 — diff vs. contract (read-only)
    doc_agent/config.yaml           # stage 7 — ADR + release notes onto the PR
  skills/
    workflow/SKILL.md               # master pipeline + state schema + dispatch templates
    grill-me/  to-spec/             # the idea/spec skills alfred runs itself
```

## Launch

alfred has nested sub-agent bundles under `agents/`, so it must be launched from
the **bundle directory or a `.tar.gz`** — NOT the bare `config.yaml` path, which
omits the nested `agents/` and fails to resolve the five sub-agents.

```
# directory form (simplest)
sys_session_create(config_path="agents/alfred", message="<your idea>")

# or an explicit bundle archive (config.yaml + agents/ + skills/ at the archive root)
#   cd agents/alfred && tar -czf ../../alfred-bundle.tar.gz config.yaml README.md agents skills
sys_session_create(config_path="alfred-bundle.tar.gz", message="<your idea>")
```

alfred starts at stage 0 (IDEA) and walks the pipeline, pausing at the two human
gates (spec approval, merge).

## Requirements

- The `claude` CLI (Claude Code) on PATH — alfred preflights this and stops with
  guidance if it is missing. All five sub-agents are claude-native.
- A configured issue tracker for the target project (GitHub `gh` or GitLab
  `glab`); the `to-tickets` skill detects which to use.
- The diva-e skill set committed under the target project's `.claude/skills/`
  (see "Where the step skills come from").
