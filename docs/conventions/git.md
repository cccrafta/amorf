---
title: Git conventions
updated: 2026-10-31
last_verified: 2026-10-31
---

# Git conventions

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, imperative mood, no trailing full stop, summary under about 70 characters. Put the reason in the body when the summary does not carry it.

Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `chore`, `build`, `ci`, `revert`.

| Scope | Covers |
| --- | --- |
| `web` | `apps/web` |
| `api` | `apps/api` (future) |
| `core` | `packages/core` (future) |
| `docs` | `docs/` outside decision records |
| `adr` | `docs/decisions/adr/` |
| `ddr` | `docs/decisions/ddr/` |
| `research` | `research/` |
| `deps` | dependency changes (`package.json`, lockfile, `pnpm-workspace.yaml`) |
| `config` | tooling and build configuration, `.gitignore`, `wrangler.jsonc` |

Examples: `feat(web): add facts tab to the entity drawer`, `docs(ddr): record the entity view frame`, `chore(deps): bump next to 16.3.6`.

## One concern per commit

A commit does one thing. A file move and an edit to the moved file are separate commits unless git would otherwise lose the rename. A decision record and the code that carries it can be two commits that cite each other.

## Never commit content or media

The GitHub repository is public. Never commit anything under `apps/web/content/` (entities and originals), media files of any size, `.env` files other than `.env.development` and `.env.production`, or secrets. These paths are gitignored on purpose; do not weaken the ignore rules to commit something, and do not `git add -f`. Before committing, read `git status` and check that no path under `content/` or no media file is staged. See [entities.md](entities.md) and [ADR-0003](../decisions/adr/0003-entities-never-in-git.md).

## Remote

`origin` is `git@github-personal:cccrafta/amorf.git`. The `github-personal` alias in `~/.ssh/config` selects the `cccrafta` key; commit identity is set per repository.
