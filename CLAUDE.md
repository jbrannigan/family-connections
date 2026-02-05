# CLAUDE.md - Project Context for AI Assistants

## Project Overview

**Family Connections** is a Next.js 16 web app for building and visualizing family trees. Users create "family graphs," add people and relationships, and view them as an interactive tree or card list. Built with Supabase (Postgres + Auth), Tailwind CSS 4, and TypeScript.

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router, Turbopack)
- **Auth**: Supabase Auth with password-based login (email + password)
- **Database**: Supabase Postgres with Row Level Security (RLS)
- **Styling**: Tailwind CSS 4, dark theme (bg `#0a1410`, accent `#7fdb9a`)
- **Tree Layout**: `relatives-tree` v3.2.2 (3KB layout engine for family trees)
- **Language**: TypeScript 5 (strict)

## Supabase

- **Project URL**: `https://dmbkijkadgyryldohlli.supabase.co`
- **Env vars** in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Uses `@supabase/ssr` for server/client cookie-based auth

### Database Schema (Supabase Postgres)

```
family_graphs: id (uuid PK), name, owner_id (FK auth.users), invite_code (unique, 8-char), created_at
memberships: user_id (FK auth.users), graph_id (FK family_graphs), role ('admin'|'member'), created_at — PK(user_id, graph_id)
persons: id (uuid PK), graph_id (FK), display_name, pronouns, birth_date, death_date, birth_location, is_incomplete (bool), notes, created_by, created_at, updated_at
relationships: id (uuid PK), graph_id (FK), person_a (FK persons), person_b (FK persons), type (text), start_date, end_date, created_by, created_at — UNIQUE(graph_id, person_a, person_b, type)
stories: id (uuid PK), graph_id (FK), person_id (FK persons), content, is_fun_fact (bool), author_id, created_at
profiles: id (uuid PK, FK auth.users), display_name, avatar_url
```

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
      page.tsx                        — Graph detail page (server component, fetches data, renders GraphViewToggle)
      graph-view-toggle.tsx           — Client toggle between Tree View and List View
      tree-view.tsx                   — Interactive tree visualization (pan/zoom, click-to-select)
      tree-node.tsx                   — Individual person node (green circle + name)
      tree-connector.tsx              — Connection lines between nodes
      person-list.tsx                 — Card grid list view with inline relationship form
      import/
        page.tsx                      — TreeDown import page (admin only)
        import-form.tsx               — TreeDown import form with preview + bulk insert
  lib/
    supabase/
      client.ts                       — Browser Supabase client
      server.ts                       — Server Supabase client (cookies)
      middleware.ts                    — Auth middleware helper
    import-treedown.ts                — TreeDown format parser (handles complex family trees)
    tree-transform.ts                 — Transforms Person/Relationship data into relatives-tree format
    relationships.ts                  — Kinship path finder (cousin degree, "2nd cousin once removed", etc.)
  types/
    database.ts                       — TypeScript types for all DB tables
  middleware.ts                       — Next.js middleware (Supabase session refresh)
```

## Key Implementation Details

### Tree Visualization (NEW - not yet committed)

Uses `relatives-tree` library for layout computation. The flow:
1. `tree-transform.ts` converts our `Person[]` + `Relationship[]` into `relatives-tree` `Node[]` format
2. `calcTree()` computes x/y positions for all nodes and connector paths
3. `tree-view.tsx` renders nodes + connectors in a CSS-transformed container
4. Pan via pointer events (drag), zoom via wheel + buttons (+/-/Fit)
5. Auto-centers tree on mount (fit-to-viewport)
6. Click a person node to see info panel at bottom

**Important TypeScript note**: `relatives-tree` uses `const enum` types (`Gender`, `RelType`). Must cast string literals: `"male" as Gender`, `"blood" as RelType`.

Node dimensions: `NODE_WIDTH=160`, `NODE_HEIGHT=100`. Grid coordinates from `calcTree()` are multiplied by `halfWidth` (80) and `halfHeight` (50) for pixel positions.

### TreeDown Parser (`import-treedown.ts`)

Custom parser for indentation-based family tree format:
- Indentation = parent-child hierarchy
- `Name1 & Name2` = married couple (handles multiple marriages: `A & B (Divorced) & C`)
- `Name1 - Name2` = simple couple (dash separator)
- Parenthesized metadata stripped: `(1870-1909)`, `(M- date)`, `(Div)`, `(b. date)`
- Nicknames preserved: `(Peggy)`, `(Kate)`, etc.
- Top-level `&` detection avoids splitting inside parentheses
- Children assigned to primary person + last/most recent spouse

### Gender Inference
`relatives-tree` requires gender for layout. Inferred from `pronouns` field: she/her = female, he/him = male, default = male. Only affects spouse left/right positioning.

### Root Selection for Tree
Auto-picks person with no parents + most descendants. Falls back to most-connected person.

## Current Test Data

The "Brannigan Family" graph (ID: `6c7ef05c-71e7-4a05-bb36-bd31f1040528`) contains ~214 people imported from the McGinty family tree file (`mcginty_tree-jcb-31JUL25-1200.txt` in project root). This is a real 5+ generation Irish-American family tree with multiple marriages, divorces, nicknames, etc.

Test user: `jim@brnngn.com` (admin of the graph)

## Git History

```
fe2584d Handle multiple marriages in TreeDown parser
44c4054 Add relationship management, TreeDown import, and enhanced parser
8cb32b8 Add dashboard pages, graph detail view, and fix RLS policies
499dee8 Use new-style publishable keys and switch to password auth
30cfbc1 feat: initial project scaffold
```

## Uncommitted Changes (Tree Visualization)

The following files are new/modified but NOT yet committed:
- `package.json` / `package-lock.json` — added `relatives-tree` dependency
- `src/lib/tree-transform.ts` — NEW: data transformation for tree layout
- `src/app/graph/[id]/tree-view.tsx` — NEW: main tree canvas with pan/zoom
- `src/app/graph/[id]/tree-node.tsx` — NEW: person node component
- `src/app/graph/[id]/tree-connector.tsx` — NEW: connection line component
- `src/app/graph/[id]/graph-view-toggle.tsx` — NEW: Tree/List view toggle
- `src/app/graph/[id]/page.tsx` — MODIFIED: uses GraphViewToggle instead of PersonList, removed max-w-5xl from main

### Status: Needs browser testing then commit
TypeScript compiles clean. Dev server compiles the page without errors. The tree view has NOT been visually tested in the browser yet.

## Dev Commands

```bash
npm run dev          # Start dev server (port 3000)
npx tsc --noEmit     # Type check
npm run lint         # ESLint
npm run build        # Production build
```

## Known Issues / Dev Notes

- Dev server on port 3000 frequently dies during idle periods. Fix: `lsof -ti:3000 | xargs kill -9; rm -f .next/dev/lock; npm run dev`
- Chrome extension (Claude in Chrome) has trouble navigating to localhost from chrome://newtab — navigate to any URL first, then to localhost
- `relatives-tree` const enums require `as Gender` / `as RelType` casts in TypeScript

## Future Work

- Stories feature (DB table exists, UI not built)
- Profile management
- Person detail/edit page
- Graph settings (rename, manage members)
- QR code for reunion check-in
- Search within tree
- Export/share tree as image
