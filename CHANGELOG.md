# Changelog

All notable changes to Family Connections will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-02-07

### Added
- **Stories & Fun Facts** — full CRUD for stories on person detail pages (PR #6)
- Add, edit, and delete stories on any person (any member can add; only author can edit/delete)
- "Fun Fact" toggle with green pill badge on story cards
- Author attribution (display name or email) with relative timestamps ("just now", "5 minutes ago", etc.)
- `formatRelativeTime()` utility with 8 unit tests
- Story count badges on person list cards ("1 story", "3 stories")
- `StoryWithAuthor` type extending Story with author profile join
- Inline delete confirmation ("Delete? Yes / No") to prevent accidental deletions
- Server actions: `createStory`, `updateStory`, `deleteStory` with auth + RLS enforcement

## [0.3.0] - 2026-02-07

### Added
- **Search & Navigation** — find anyone instantly across 241+ family members (PR #5)
- Search input with magnifying glass icon, clear button, and `⌘K` / `Ctrl+K` keyboard shortcut
- **Tree view**: dropdown shows matching persons with highlighted text; click to animated pan+zoom to node with brief highlight flash
- **List view**: real-time card filtering with green match highlighting and "X of Y persons" result count
- "No persons found" empty state with search query shown
- Search state persists when switching between tree and list views
- `Escape` key clears search and blurs input
- Pure `searchPersons()` utility with case-insensitive substring matching, match ranges for highlighting, and prefix-match priority sorting
- 10 unit tests for search utility

## [0.2.0] - 2026-02-06

### Added
- **Person detail/edit page** at `/graph/[id]/person/[personId]` — view and edit any person's info (PR #4)
- View mode: displays name, pronouns, dates, birth location, notes, relationships (grouped by type), and stories
- Edit mode (admin-only): inline form with date validation, save/cancel
- Relationship grouping: parents, spouses, children with type labels and links to related persons
- Tree view click navigation: clicking a person node navigates to their detail page
- List view links: person names and relationship names are now clickable links to person pages
- Shared date utilities (`date-utils.ts`): `normalizeDate()`, `isValidDate()`, `formatDateForDisplay()`
- 16 unit tests for date utilities

## [0.1.1] - 2026-02-06

### Fixed
- TreeDown parser: `stripMetadata()` no longer strips closing parens from nicknames like `(Peggy)` (PR #2)
- TreeDown parser: `addSurname()` now places surname after nickname — `Katherine (Kate) McGinty` not `Katherine McGinty (Kate)` (PR #2)

### Removed
- Unused tree visualization packages: `d3-dtree`, `family-chart`, `relatives-tree`, `topola` (PR #3)
- Dead code: `dtree-view.tsx`, `tree-view.tsx`, `family-chart-view.tsx`, `tree-transform.ts`, `family-chart-transform.ts` (~2,800 lines) (PR #3)

### Added
- Engineering workflow: feature docs, branching model, CI with tests, versioning conventions (PR #1)
- Vitest + React Testing Library for unit/integration tests (PR #1)
- Playwright for E2E tests (PR #1)
- 12 unit tests for TreeDown parser (PR #1, #2)
- Feature doc template at `docs/features/_TEMPLATE.md` (PR #1)

## [0.1.0] - 2025-02-05

### Added
- Initial project scaffold with Next.js 16, TypeScript, Tailwind CSS 4
- Supabase authentication with password-based login
- Family graph creation with invite codes for sharing
- Person and relationship management (6 relationship types)
- TreeDown bulk import with preview and gender-based surname inference
- Interactive tree visualization (SimpleTreeView with couple nodes, pan/zoom)
- List view with person cards and inline relationship management
- Kinship calculator (BFS pathfinding for relationship labels)
- ISO 8601 reduced-precision date support (year, year-month, full date)
- CI pipeline with lint, type check, and build (GitHub Actions)
- Project documentation (CLAUDE.md, SETUP.md, NEXT-STEPS.md, README.md)
- Database schema with Row-Level Security policies
- 241 people and 403 relationships imported (Brannigan/McGinty family tree)
