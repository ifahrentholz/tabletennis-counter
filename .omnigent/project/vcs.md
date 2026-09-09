# VCS & Tracker

Abgeleitet aus dem Repo (radar, deterministisch). Zwei getrennte Felder:

| Feld | Wert |
|---|---|
| **VCS** | GitHub — `git@github.com:ifahrentholz/tabletennis-counter.git` |
| **Tracker** | GitHub Issues, gleiches Repo |
| **CLI** | `gh`, authentifiziert als `ifahrentholz` (keyring). `glab` ist installiert, aber **nicht** authentifiziert (401) und hier irrelevant. |
| **Default-Branch** | `main` |

## Branch-Konvention

`feature/issue-<nummer>-<kebab-slug>` — belegt durch alle 11 Remote-Branches,
z. B. `feature/issue-27-safe-area`, `feature/issue-29-design-pass`.

## Commit-Konvention

Conventional Commits mit Issue-Referenz. Zwei gelebte Varianten:

- `feat(setup): add match setup form with presets, names & creation (#4)`
- `docs(#29): record the design system as ADR 0009, plus two refinements`

Typen im Log: `feat`, `fix`, `docs`, `chore`-artige Freiform (`init`,
`update package-lock.json` — Ausreißer, nicht nachahmen).

## Merge-Konvention

Pull Request pro Issue, Merge-Commit (`Merge pull request #30 from
ifahrentholz/feature/issue-29-design-pass`). Kein Squash, kein Rebase-Merge im
Log erkennbar. Direkte Commits auf `main` existieren (die letzten Design-Commits) —
Ausnahme, nicht Regel.

## Templates

Keine. Weder `.github/ISSUE_TEMPLATE` noch `.github/pull_request_template.md`
noch GitLab-Äquivalente vorhanden.

## CI

GitHub Actions, ein Workflow: `.github/workflows/ci.yml` ("CI"), triggert auf
`push` nach `main` und auf jeden `pull_request`. Node `22.13.0` (= `.nvmrc`).
Gates in dieser Reihenfolge: `npm ci` → `npm run format:check` →
`npm run lint` → `npm run typecheck` → `npm test -- --ci`.
Verifizierte lokale Invocations siehe `commands.md`.

## Labels (vorhanden, `gh label list`)

Projektspezifisch: `feature`, `mobile`, `ci`, `ready-for-agent`,
`domain-logic`, `persistence`, `ui`, `design`, `blocked`.
GitHub-Defaults zusätzlich vorhanden: `bug`, `documentation`, `duplicate`,
`enhancement`, `good first issue`, `help wanted`, `invalid`, `question`,
`wontfix`.

Welche Labels neue Issues tragen sollen: **noch nicht vom Menschen bestätigt.**
