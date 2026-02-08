# Changelog

All notable changes to Family Connections will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.1] - 2026-02-07

### Fixed
- **Hydration mismatch** — tree settings (orientation, connection style, node style) no longer cause a React hydration error when non-default values are saved in localStorage (PR #13)
- Replaced `useState` + `useEffect` pattern with `useSyncExternalStore` for SSR-safe localStorage sync with cached snapshots

## [0.8.0] - 2026-02-07

### Added
- **Ancestor & Descendant View** — focus on a single person's lineage within the tree (Feature 011, PR #12)
- Tree mode selector in toolbar: Full Tree / Ancestors / Descendants
- Ancestor view: select a person to see their direct pedigree chart (parents, grandparents, great-grandparents as couple nodes)
- Descendant view: select a person to see only their descendants branching out below
- Focus person indicator pill with clear button to return to full tree
- All existing tree settings (orientation, connection style, node style) work in all view modes
- Extracted `buildTreeMaps()` shared helper for tree transform functions (refactor, no behavior change)
- `transformToAncestorTree()` and `transformToDescendantTree()` with 20 unit tests

## [0.7.0] - 2026-02-07

### Added
- **Archival Export** — download your family tree as a plain-text archive or structured JSON (Feature 008, PR #11)
- Export dropdown button (admin-only) on graph page with two download formats
- Plain-text archive (.txt): human-readable narrative with Unicode box-drawing header, person facts, unions, children, parents, notes, and quoted stories with author attribution — sorted alphabetically
- JSON export (.json): structured data with all persons, relationships, stories, graph metadata, and summary counts for programmatic use or future re-import
- API route `GET /api/graph/[id]/export?format=txt|json` with admin-only auth checks
- `ExportButton` client component with dropdown menu and browser file download via blob URL
- `archive-export.ts` — `generateArchiveText()` and `generateArchiveJSON()` with 21 unit tests

## [0.6.0] - 2026-02-07

### Added
- **Union Rendering** — type-aware display of marriages, divorces, and partnerships across all views (Feature 007, PR #10)
- Union cards on person detail page: 💍 Married (green), 💔 Divorced (red), 🤝 Partners (blue) with date ranges and partner links
- Unions section separated from Parents/Children ("Family") on person detail page
- Tree view union type indicators: colored pill on couple node divider (detailed mode) and label below name (compact mode)
- List view human-readable labels: "Married to" / "Divorced from" / "Partner of" replacing generic "Spouse of"
- `union-utils.ts` — `resolveUnions()`, `formatUnionDateRange()`, `getUnionLabel()`, `getUnionTypeLabel()` with 24 unit tests
- `TreeDisplayNode.unionType` field carries relationship type for couple node rendering

## [0.5.0] - 2026-02-07

### Added
- **Enhanced Tree Visualization** — rich nodes, layout options, and structured name data (Feature 010, PRs #7–#9)
- Person name columns: `given_name`, `nickname`, `preferred_name`, `avatar_url` with data migration from existing `display_name` values (PR #7)
- Edit UI for new name fields on person detail page (3-column grid: Given Name, Nickname, Preferred Name) (PR #7)
- `name-utils.ts` — `parseDisplayName()` and `getDisplayParts()` utilities with 16 unit tests (PR #7)
- Tree layout orientation toggle: **Vertical** (top-down) and **Horizontal** (left-right) with localStorage persistence (PR #8)
- Tree connection style toggle: **Curved** (Bézier) and **Right-angle** (orthogonal step) for both orientations (PR #8)
- Smart back button on person detail page — uses browser history when navigating from graph, direct link otherwise (PR #8)
- Rich detailed tree nodes: multi-line content with primary name, nickname, surname, lifespan dates, birth location (PR #9)
- Pronoun-based avatar silhouettes (he/him, she/her, they/them) as SVG placeholders (PR #9)
- Compact/Detailed node style toggle — compact shows single-line name, detailed shows full person info (PR #9)
- Couple nodes in detailed mode split left/right with divider and scaled-down person info (PR #9)
- All tree settings (orientation, connections, node style) persist to localStorage (PR #9)

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
