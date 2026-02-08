# Feature 010: Enhanced Tree Visualization

**Status:** In Progress
**Branch:** `feat/010a-person-name-columns` (PR 1), `feat/010b-tree-layout-options` (PR 2), `feat/010c-rich-tree-nodes` (PR 3)
**PRs:** (link PRs here as they're created)

## Summary

Upgrade the family tree visualization with layout orientation toggle (vertical/horizontal), connection style toggle (curved/right-angle), rich multi-line node content (given name, nickname, dates, location, avatar placeholder), and new database columns for structured person name data.

## Motivation

The current tree view shows minimal information: a single line of text per node with "Name (lifespan) & Spouse (lifespan)". Users want richer nodes that show key biographical data at a glance — given name, nickname, dates, location, and an avatar or pronoun-based silhouette. The tree also only supports horizontal (left-to-right) layout with curved Bezier connections. Users want the option of a traditional vertical (top-down) family tree with right-angle connectors.

## Scope

### In Scope
- **Layout orientation toggle**: Vertical (top-down, new default) and Horizontal (left-right, current)
- **Connection style toggle**: Curved (Bezier, current) and Right-angle (orthogonal step connectors)
- **New person columns**: `given_name`, `nickname`, `preferred_name`, `avatar_url`
- **Data migration**: Parse existing `display_name` values to populate `given_name` and `nickname` for 241 existing records
- **Rich node content**: Multi-line nodes with name parts, dates, location, and avatar placeholder
- **Avatar placeholders**: Pronoun-based SVG silhouettes (he/him, she/her, they/them)
- **Settings persistence**: Tree layout preferences saved to localStorage
- **Person edit form**: New fields for given name, nickname, preferred name

### Out of Scope
- Avatar photo upload (stretch goal, separate PR)
- Custom color themes for the tree
- Collapse/expand subtrees
- Variable node sizes based on content (use fixed dimensions)
- Horizontal layout for individual nodes (e.g., timeline within a node)

## Design

### User Experience

#### Tree Settings Toolbar
Above the tree (alongside existing Tree View / List View toggle), a settings row with:
- **Orientation**: Vertical | Horizontal toggle
- **Connections**: Curved | Right-angle toggle

Settings persist via localStorage so they're remembered between sessions.

#### Rich Node Content
Each node shows:
- **Avatar**: 32×32 circle — photo if available, or a pronoun-based silhouette
- **Name**: Preferred name or given name (bold, 13px)
- **Nickname**: In quotes/italics (11px) — e.g., "Peggy"
- **Dates**: Birth–Death years (10px, muted)
- **Location**: Birth location (10px, very muted)

Couple nodes show two person blocks side-by-side with a divider line.

### Technical Approach

See plan file for detailed PR breakdown with file lists and implementation details.

### Database Changes

```sql
ALTER TABLE persons ADD COLUMN given_name text;
ALTER TABLE persons ADD COLUMN nickname text;
ALTER TABLE persons ADD COLUMN preferred_name text;
ALTER TABLE persons ADD COLUMN avatar_url text;
```

Data migration extracts `given_name` and `nickname` from existing `display_name` values.

## Acceptance Criteria

- [ ] Tree supports vertical (top-down) and horizontal (left-right) orientations
- [ ] Tree supports curved and right-angle connection styles
- [ ] All 4 combinations (2 orientations × 2 styles) render correctly
- [ ] Tree nodes show given name, nickname, dates, location, and avatar placeholder
- [ ] Couple nodes show both people side-by-side
- [ ] Avatar silhouettes match pronouns (he/him, she/her, they/them)
- [ ] Settings persist across sessions via localStorage
- [ ] Default is vertical + curved
- [ ] Person edit form includes given name, nickname, preferred name fields
- [ ] Existing 241-person dataset has `given_name` and `nickname` populated from migration
- [ ] Performance: renders 241 people without lag in all layout combinations

## Test Plan

### Unit Tests
- `parseDisplayName()` — extracts given name and nickname from various display_name patterns
- `getDisplayParts()` — returns structured name parts with fallback to display_name parsing
- `loadTreeSettings()` / `saveTreeSettings()` — localStorage persistence
- `getAvatarSilhouette()` — correct SVG path for each pronoun

### Integration Tests
- Tree re-renders when settings change
- Person edit form saves new name fields

### E2E Tests
- Toggle orientation → tree re-renders in new layout
- Toggle connection style → connectors change shape
- Edit person → add nickname → appears in tree node

### Regression
- Existing tree interactions (pan, zoom, click, focus-on-person) still work
- Search + jump-to-person works in both orientations

## PR Breakdown

1. **PR 1: Schema + name fields** — Migration, Person type, name-utils, edit form updates
2. **PR 2: Layout + connections** — Orientation toggle, connection style toggle, tree refactor
3. **PR 3: Rich nodes** — Multi-line node rendering, avatar silhouettes, couple nodes
4. **PR 4: Avatar upload** (stretch) — Supabase Storage, upload component, photo in nodes

## Notes

- The current tree loads D3 from CDN (`d3@7.8.5`) — this approach is kept for consistency
- `TreeDisplayNode` already carries `personIds[]` — the renderer will look up full Person data from a map
- The `isNickname()` function in `import-treedown.ts` already identifies nicknames — the data migration uses similar logic
- Vertical default was chosen because it matches traditional family tree expectations

---
*Created: 2026-02-07*
*Last updated: 2026-02-07*
