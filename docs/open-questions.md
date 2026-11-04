---
title: Open questions
updated: 2026-10-31
last_verified: 2026-10-31
---

# Open questions

Choices that are raised but not made. A question here needs a decision from a person, not more work. Work that is already decided goes in [backlog.md](backlog.md). A made decision becomes a record ([decision-records.md](conventions/decision-records.md)) or a backlog item.

Design questions about the entity view stay in [design/entity-view.md](design/entity-view.md) ("Open questions"). This page links to them and does not copy them.

## How to use this page

- One section per question, id `OQ-NNN`, numbered in order and never reused.
- Each question has: **Status** (`open`, `decided` or `dropped`), **Raised** (date), **Area**, **Question**, **Context**, **Options**, **Recommendation**, **Outcome**.
- When it is decided: fill in **Outcome**, link the record or backlog item that carries it, set the status and move the section to [Closed](#closed). Do not delete it.
- Bump `updated:` on every change.

## Index

| Id | Question | Area | Status |
| --- | --- | --- | --- |
| [OQ-001](#oq-001-block-media-in-a-pre-commit-hook) | Block media in a pre-commit hook? | tooling, git | open |
| [OQ-002](#oq-002-run-entitiescheck-automatically-after-entity-edits) | Run `entities:check` automatically after entity edits? | tooling, entities | open |
| [OQ-003](#oq-003-add-a-new-record-skill) | Add a `new-record` skill? | tooling, research | open |
| [OQ-004](#oq-004-keep-the-cloudflare-account-id-in-the-public-repo) | Keep the Cloudflare account id in the public repo? | deployment | open |
| [OQ-005](#oq-005-ask-github-to-purge-removed-media) | Ask GitHub to purge the media removed from history? | git | open |

## OQ-001: Block media in a pre-commit hook

- **Status:** open
- **Raised:** 2026-10-31
- **Area:** tooling, git
- **Question:** Should a git pre-commit hook refuse staged media files?
- **Context:** The repo is public and media never goes into git ([ADR-0002](decisions/adr/0002-large-media-in-r2.md), [ADR-0003](decisions/adr/0003-entities-never-in-git.md)). `.gitignore` only catches paths it lists. Media was committed before and history had to be rewritten on 2026-10-31.
- **Options:**
  1. Pre-commit hook that rejects staged `mp4|mov|webm|jpg|jpeg|png|gif|webp|tif|rtf` outside an allowlist (`apps/web/app/`, `apps/web/public/` icons). It catches commits from people and from agents.
  2. Claude Code `PreToolUse` hook on `git add`/`git commit`. It catches agent commits only.
  3. Keep `.gitignore` only.
- **Recommendation:** 1. Install it from the repo with a `prepare` script so every clone gets it.
- **Outcome:** —

## OQ-002: Run entities:check automatically after entity edits

- **Status:** open
- **Raised:** 2026-10-31
- **Area:** tooling, entities
- **Question:** Should `pnpm entities:check` run on its own after an entity changes?
- **Context:** [entities.md](conventions/entities.md) says to run it after every change. Entities are gitignored, so CI never sees them and nothing enforces the rule.
- **Options:**
  1. Claude Code `PostToolUse` hook on Write/Edit under `apps/web/content/entities/`.
  2. Run it as a step of `pnpm build` and `pnpm run deploy`.
  3. Both.
- **Recommendation:** 3. The hook catches mistakes while editing, and the build step catches hand edits.
- **Outcome:** —

## OQ-003: Add a new-record skill

- **Status:** open
- **Raised:** 2026-10-31
- **Area:** tooling, research
- **Question:** Should a Claude skill scaffold experiments, ADRs and DDRs?
- **Context:** Each new record needs the next `NNNN`, a copied template, dates, and links on both sides (`decisions` in the experiment, `evidence` or `related` in the record). The both-way link is the step most easily missed ([research-log.md](conventions/research-log.md)).
- **Options:**
  1. Skill `new-record` under `.claude/skills/`, next to `portfolio-compile`.
  2. Keep copying templates by hand.
- **Recommendation:** 1 only if records are written more than a few times a month. Otherwise 2.
- **Outcome:** —

## OQ-004: Keep the Cloudflare account id in the public repo

- **Status:** open
- **Raised:** 2026-10-31
- **Area:** deployment
- **Question:** Should the Cloudflare account id stay in `apps/web/wrangler.jsonc` and [deployment.md](deployment.md)?
- **Context:** The login sees two accounts, so every Wrangler command needs the id. An account id is an identifier, not a credential; access needs an API token or login.
- **Options:**
  1. Keep it committed.
  2. Move it to an untracked env var (`CLOUDFLARE_ACCOUNT_ID`) and drop it from docs.
- **Recommendation:** 1. Removing it costs a setup step on every machine and protects nothing.
- **Outcome:** —

## OQ-005: Ask GitHub to purge removed media

- **Status:** open
- **Raised:** 2026-10-31
- **Area:** git
- **Question:** After the 2026-10-31 history rewrite, should GitHub Support be asked to purge the old commits?
- **Context:** `git filter-repo` removed `lib/interview/`, `lib/iranian Ice resevoirs/`, `public/entries/` and `public/media/` from every branch. GitHub can still serve the old commits by SHA from its cache until Support runs garbage collection. The repo had no forks and no pull requests at the time.
- **Options:**
  1. Open a GitHub Support request to remove cached views and run GC.
  2. Leave it; the old SHAs are unlinked and hard to find.
- **Recommendation:** 1 if any of the media is licensed or personal (the interview), otherwise 2.
- **Outcome:** —

## Closed

None yet.
