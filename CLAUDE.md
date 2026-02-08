# CLAUDE.md - Project Context for AI Assistants

## Project Overview

**Family Connections** is a Next.js 16 web app for building and visualizing family trees. Users create "family graphs," add people and relationships, and view them as an interactive tree or card list. Built with Supabase (Postgres + Auth), Tailwind CSS 4, and TypeScript.

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router, Turbopack)
- **Auth**: Supabase Auth with password-based login (email + password)
- **Database**: Supabase Postgres with Row Level Security (RLS)
- **Styling**: Tailwind CSS 4, dark theme (bg `#0a1410`, accent `#7fdb9a`)
- **Tree Layout**: Custom `SimpleTreeView` component with couple nodes
- **Language**: TypeScript 5 (strict)

## Supabase

- **Project URL**: `https://dmbkijkadgyryldohlli.supabase.co`
- **Env vars** in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Uses `@supabase/ssr` for server/client cookie-based auth

### Database Schema (Supabase Postgres)

```
family_graphs: id (uuid PK), name, owner_id (FK auth.users), invite_code (unique, 8-char), created_at
memberships: user_id (FK auth.users), graph_id (FK family_graphs), role ('admin'|'member'), created_at — PK(user_id, graph_id)
persons: id (uuid PK), graph_id (FK), display_name, given_name, nickname, preferred_name, avatar_url, pronouns, birth_date (text), death_date (text), birth_location, is_incomplete (bool), notes, created_by, created_at, updated_at
relationships: id (uuid PK), graph_id (FK), person_a (FK persons), person_b (FK persons), type (text), start_date (text), end_date (text), created_by, created_at — UNIQUE(graph_id, person_a, person_b, type)
stories: id (uuid PK), graph_id (FK), person_id (FK persons), content, is_fun_fact (bool), author_id, created_at
profiles: id (uuid PK, FK auth.users), display_name, avatar_url
```

**Note**: Date columns use `text` type to support ISO 8601 reduced precision (year-only "1958", year-month "1958-03", or full "1958-03-15").

### Relationship Types
- Parent types: `biological_parent`, `adoptive_parent`, `step_parent` — person_a is parent, person_b is child
- Spouse types: `spouse`, `ex_spouse`, `partner` — bidirectional

### RLS Policies
All tables use RLS. Access requires membership in the graph. Bootstrap policy on `memberships` allows INSERT for graph owners. SELECT policies on `persons` and `relationships` use `EXISTS (SELECT 1 FROM memberships WHERE ...)` to avoid recursion.

## File Structure

```
src/
  app/
    page.tsx                          — Landing/home page
    layout.tsx                        — Root layout (Inter font, dark theme)
    globals.css                       — Tailwind imports
    auth/
      login/page.tsx                  — Login + registration form (password auth)
      callback/route.ts               — Supabase auth callback handler
    dashboard/
      page.tsx                        — User's graphs list
      actions.ts                      — Server actions (createGraph, joinGraph)
      new/page.tsx                    — Create new graph form
      join/page.tsx                   — Join graph via invite code
      sign-out-button.tsx             — Client sign-out button
    graph/[id]/
      page.tsx                        — Graph detail page (server component)
      graph-view-toggle.tsx           — Client toggle between Tree View and List View
      simple-tree-view.tsx            — Interactive tree visualization with couple nodes
      person-list.tsx                 — Card grid list view with inline relationship form
      import/
        page.tsx                      — TreeDown import page (admin only)
        import-form.tsx               — TreeDown import form with preview + bulk insert
  lib/
    supabase/
      client.ts                       — Browser Supabase client
      server.ts                       — Server Supabase client (cookies)
      middleware.ts                   — Auth middleware helper
    import-treedown.ts                — TreeDown format parser with gender inference
    name-utils.ts                     — Name parsing (parseDisplayName, getDisplayParts)
    relationships.ts                  — Kinship path finder (cousin degree, etc.)
  types/
    database.ts                       — TypeScript types for all DB tables
  middleware.ts                       — Next.js middleware (Supabase session refresh)
supabase/
  migrations/                         — Database migration files
```

## Key Implementation Details

### Tree Visualization (`simple-tree-view.tsx`)

Custom SVG-based tree with couple nodes showing "Person & Spouse" together. Features:
- Couple nodes with combined display
- Vertical tree layout with children below
- Pan via drag, zoom via wheel + buttons
- Auto-fit to viewport on mount
- Click person to see info panel

### TreeDown Parser (`import-treedown.ts`)

Custom parser for indentation-based family tree format:
- Indentation = parent-child hierarchy
- `Name1 & Name2` = married couple (handles multiple marriages)
- `Name1 - Name2` = simple couple (dash separator)
- Parenthesized metadata: `(1870-1909)`, `(M- date)`, `(Div)`, `(b. date)`
- **Gender inference** from first names for surname inheritance:
  - Male primary → children get primary's surname
  - Female primary with spouse → children get spouse's surname
- Nicknames preserved: `(Peggy)`, `(Kate)`, etc.

### Date Handling (ISO 8601 Reduced Precision)

Dates support reduced precision per ISO 8601:
- Year only: `"1958"`
- Year and month: `"1958-03"`
- Full date: `"1958-03-15"`

Database columns are `text` type. The `normalizeDate()` function in `src/lib/date-utils.ts` validates format.

## Current Test Data

The "Brannigan Family" graph (ID: `6c7ef05c-71e7-4a05-bb36-bd31f1040528`) contains 241 people and 403 relationships imported from the McGinty family tree. This is a real 5+ generation Irish-American family tree with multiple marriages, divorces, nicknames, etc.

Test user: `jim.brannigan@gmail.com` (admin of the graph)

## Dev Commands

```bash
npm run dev          # Start dev server (port 3000)
npx tsc --noEmit     # Type check
npm run lint         # ESLint
npm run build        # Production build
```

## Known Issues / Dev Notes

- **Port 3000 zombie process**: Dev server frequently dies during idle. Fix: `lsof -ti:3000 | xargs kill -9; rm -f .next/dev/lock; npm run dev`
- **Chrome localhost navigation**: Claude in Chrome extension has trouble navigating to localhost from chrome://newtab — navigate to any URL first, then to localhost
- **Large trees**: Very large family trees (500+ people) may have performance issues with the current tree renderer

## Environment Setup

See `SETUP.md` for detailed installation and configuration instructions.

## Roadmap

See `NEXT-STEPS.md` for planned features and improvements.

---

## Engineering Workflow

This project follows a structured engineering workflow. **All work must flow through this process.**

### 1. Feature Lifecycle

Every change — feature, fix, refactor, or chore — follows this pipeline:

```
Feature Doc → Branch → Implement → Test → PR → Review → Merge → Version
```

#### Step 1: Feature Document
Before writing code, create a feature doc in `docs/features/`:
- Use the template at `docs/features/_TEMPLATE.md`
- Name it `NNN-short-description.md` (e.g., `001-person-detail-page.md`)
- Describe: what, why, scope, acceptance criteria, test plan
- A feature doc may map to **one or more PRs** (break large features into mergeable increments)

#### Step 2: Feature Branch
- Branch from `main` using the naming convention: `feat/NNN-short-description`, `fix/NNN-short-description`, or `chore/NNN-short-description`
- Examples: `feat/001-person-detail-page`, `fix/002-date-validation`, `chore/003-add-vitest`

#### Step 3: Implement
- Write code in small, focused commits with clear messages
- Follow existing patterns in the codebase (server components, Tailwind, TypeScript strict)
- Update types in `src/types/database.ts` if schema changes
- Update `CLAUDE.md` if architecture changes

#### Step 4: Test
- **Unit tests** (Vitest): For parsers, utilities, calculations, and pure logic (`*.test.ts` next to source files)
- **Integration tests** (Vitest): For component rendering and API interactions (`__tests__/` directories)
- **E2E tests** (Playwright): For critical user flows (`e2e/` directory)
- Tests must pass locally before PR. Run: `npm test` (unit/integration), `npm run test:e2e` (E2E)

#### Step 5: Pull Request
- Push branch to origin, create PR via `gh pr create`
- PR title: concise, under 70 chars
- PR body: reference the feature doc, summarize changes, include test plan
- **Claude must prompt the user to review and approve the PR before merging**
- CI must pass (lint + typecheck + build + tests)
- **Always update the repo `README.md`** to reflect any user-facing changes in the PR

#### Step 6: Merge & Version
- Squash-merge to `main` (keeps history clean)
- After merging, decide if this warrants a version bump (see Versioning below)
- Update `CHANGELOG.md` with what shipped

### 2. Branching Model (GitHub Flow)

```
main (always deployable)
 └── feat/001-person-detail-page
 └── fix/002-date-validation
 └── chore/003-add-vitest
```

- `main` is the only long-lived branch
- All work happens on short-lived feature/fix/chore branches
- Merge via PR only — no direct commits to main
- Delete branches after merge

### 3. Versioning (Semantic Versioning)

Format: `vMAJOR.MINOR.PATCH` (currently `v0.1.0` — pre-1.0 means breaking changes are expected)

- **PATCH** (`0.1.1`): Bug fixes, small tweaks, dependency updates
- **MINOR** (`0.2.0`): New features, non-breaking changes
- **MAJOR** (`1.0.0`): Breaking changes, major milestones (1.0 = "ready for family to use")

**When to bump:**
- After merging a feature PR → bump MINOR
- After merging a fix PR → bump PATCH
- Multiple related PRs can share a version bump
- Tag releases: `git tag v0.2.0 && git push --tags`
- Update `version` in `package.json` and add entry to `CHANGELOG.md`

### 4. Testing Strategy

| Layer | Tool | Location | What to Test |
|-------|------|----------|-------------|
| Unit | Vitest | `*.test.ts` next to source | Parsers, utilities, calculations, pure functions |
| Integration | Vitest + React Testing Library | `__tests__/` dirs | Component rendering, form behavior, state management |
| E2E | Playwright | `e2e/` dir | Login flow, create graph, add person, import TreeDown, tree navigation |
| Regression | Both | Tagged in describe blocks | Bugs that were fixed — prevent them from returning |

**Regression test rule:** When fixing a bug, always write a test that reproduces the bug first, then fix it. The test prevents regression.

**Test commands:**
```bash
npm test              # Run unit + integration tests (Vitest)
npm run test:watch    # Run tests in watch mode
npm run test:e2e      # Run E2E tests (Playwright)
npm run test:all      # Run everything
```

### 5. CI Pipeline

GitHub Actions runs on every PR and push to main:
1. **Lint & Type Check** — ESLint + `tsc --noEmit`
2. **Unit & Integration Tests** — `npm test`
3. **Build** — `npm run build` (catches SSR/build errors)
4. **E2E Tests** — `npx playwright test` (on PRs only, against build)

All checks must pass before a PR can be merged.

### 6. Database Changes

1. Create migration in `supabase/migrations/` with descriptive name
2. Run migration via Supabase MCP tool (`apply_migration`) or SQL Editor
3. Update TypeScript types in `src/types/database.ts`
4. Update the schema section in this file (CLAUDE.md)
5. Include migration in the PR — reviewer should see schema changes

### 7. Claude-Specific Rules

When working with Claude (AI assistant):
- **Always create a feature doc first** for non-trivial work
- **Always create a feature branch** — never commit directly to main
- **Always prompt the user to review the PR** before merging
- **Always run tests** before creating a PR
- **Always update CHANGELOG.md** after merging
- **Ask before making architectural decisions** — present options, let the user choose
- **Break large features into multiple PRs** — each PR should be reviewable in one sitting
