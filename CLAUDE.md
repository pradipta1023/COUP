# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

COUP is a set of Claude Code skills that orchestrate the end-to-end implementation of GitHub issues — from fetching the issue and planning to writing code, running tests, and committing. It contains no application source code; everything here is skill definitions, hooks, and helper scripts for the Claude Code harness.

## Invoking the main skill

When the user provides a GitHub issue number and asks you to implement it, invoke the orchestrator:

```
/implement-user-story
```

This loads `.claude/skills/implement-user-story/SKILL.md`, which owns the full lifecycle.

## Phase architecture

The orchestrator runs five phases in strict sequence — never skip a phase:

```
Phase 0: Fetch & Analyse      → skills/issue-context/SKILL.md
Phase 1: Collaborative Planning → skills/story-planning/SKILL.md
Phase 2: Task Breakdown        → skills/task-creation/SKILL.md
Phase 3: Per-task Implementation → skills/task-implementation/SKILL.md (once per task)
Phase 4: Wrap-Up               → handled in implement-user-story/SKILL.md
```

**Incremental loading rule:** Load each sub-skill file only at the moment that phase begins. Do not read sub-skills upfront.

Each phase writes its output to `docs/<story_number>/`:
- `context.md` — issue content + codebase findings (Phase 0)
- `plan.md` — agreed implementation plan (Phase 1)
- `tasks.md` — task list with acceptance criteria (Phase 2)

If `docs/<story_number>/` already exists with files, ask the user whether to resume or start fresh before proceeding.

## Hooks (automatic — no manual invocation needed)

**PostToolUse (Write/Edit/MultiEdit):** `.claude/hooks/lint.sh` — runs the per-file linter for whichever project area the file belongs to:
- `frontend/*` → `frontend/scripts/lint.sh <file>`
- `backend/*` → `backend/scripts/lint.sh <file>`

**Stop:** `.claude/hooks/stop-check.sh` — runs full system validation before Claude stops:
```bash
# frontend
npx eslint .
npx tsc --noEmit
# backend
deno lint .
deno test
```

All checks must pass before any commit.

## Key principles enforced by the skills

- Every assumption must be labeled `[ASSUMPTION]` and confirmed with the user.
- Tests must pass before every commit — no exceptions.
- Commit after each task using conventional commit format: `type(scope): subject` + `body` + `Closes #<NUMBER>`.
- User approval is required at every phase gate before proceeding.
- Backward navigation (to Phase 1 or 2) is always offered if a problem is discovered mid-implementation.
