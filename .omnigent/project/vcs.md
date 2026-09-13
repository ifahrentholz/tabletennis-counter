# VCS & Tracker

## VCS
- Host: GitHub (github.com)
- Repo: `ifahrentholz/tabletennis-counter` (origin, SSH)
- CLI: `gh` — authenticated as `ifahrentholz`. `glab` ist NICHT authentifiziert.
- Default-Branch: `main`

## Tracker
- Tickets: GitHub Issues, gleiches Repo (`ifahrentholz/tabletennis-counter`)
- Labels im Gebrauch: `feature`, `bug`, `enhancement`, `ci`, `design`,
  `domain-logic`, `persistence`, `ui`, `mobile`, `ready-for-agent`, `blocked`
- Konvention: neue Issues bekommen `ready-for-agent` + passende Bereichs-Labels
  (`domain-logic` / `persistence` / `ui` / `mobile` / `ci` / `design`);
  Abhängigkeiten via `blocked`
- Issue-/PR-Templates: keine vorhanden

## Branches
- Muster: `feature/issue-<n>-<slug>` (Ticket-Arbeit), `feature/<slug>` und
  `fix/<slug>` (ohne Ticket)

## Commits
- Conventional Commits: `feat(scope): …`, `fix(scope): …`, `docs(…): …`
- Ticket-Referenz im Subject: `(#n)` am Ende oder `feat(#n):` / `docs(#n):`
- Merge in `main` via GitHub PR ("Merge pull request #n from …")

---
Derived at: `ca3b966c1bb11662c3f0532915318e21ae7549e9` · 2026-09-13
