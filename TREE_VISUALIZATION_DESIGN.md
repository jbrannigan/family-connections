# Tree Visualization Design Document

## Overview

This document captures the design decisions, investigation routes, and current state of the family tree visualization feature for the Family Connections app.

## Goals

1. **Visualize family trees** from the database (Person + Relationship records)
2. **Show couples as connected units** - two parents should appear together visually
3. **Support the existing data model** - don't change how data is stored
4. **Handle complex trees** - 200+ people, multiple marriages, 5+ generations

## Data Model (Existing - Do Not Change)

### Database Schema
```
persons: id, display_name, pronouns, birth_date, death_date, birth_location, notes
relationships: person_a, person_b, type, start_date, end_date
```

### Relationship Types
- **Parent types**: `biological_parent`, `adoptive_parent`, `step_parent` (person_a is parent, person_b is child)
- **Spouse types**: `spouse`, `ex_spouse`, `partner` (bidirectional)

### Key Principle
Each person is stored as a **separate record**. Couples are linked via spouse relationships. This is the correct data model and should NOT be changed.

## Test Data

- **Graph**: "Brannigan Family" (ID: `6c7ef05c-71e7-4a05-bb36-bd31f1040528`)
- **Size**: ~214 people, 5+ generations
- **Source**: McGinty family tree imported from TreeDown format
- **Root couple**: John McGinty (1870-1909) & Margaret Kirk (1871-1906)
- **Test user**: `jim@brnngn.com`

## Reference Files (Original Working Implementation)

These files in the project root show what the correct output should look like:

1. **`mcginty_tree-jcb-31JUL25-1200-2026-02-04_23-18-41.json`** - Hierarchical tree data with combined couple names
2. **`mcginty_tree-jcb-31JUL25-1200-2026-02-04_23-18-32.html`** - Static HTML tree view (expandable/collapsible)
3. **`tree-diagram-2026-02-05T05-17-34.svg`** - SVG export of the tree

The JSON shows the expected format:
```json
{
  "id": "n-0",
  "name": "John McGinty (1870-1909) & Margaret Kirk (1871-1906) (M- 13 July 1894, Scotland)",
  "children": [...]
}
```

## Libraries Investigated

### 1. relatives-tree (v3.2.2)
- **Status**: Had infinite loop issues
- **Pros**: Small (3KB), designed for family trees, supports two parents
- **Cons**: Uses `const enum` requiring TypeScript casts, had rendering bugs
- **Files**: `src/lib/tree-transform.ts` (original transform)

### 2. family-chart
- **Status**: Abandoned - fundamental data model mismatch
- **Pros**: Good D3-based layout, nice styling
- **Cons**: Only supports ONE parent per child (throws error with two parents)
- **Files**: `src/lib/family-chart-transform.ts`, `src/app/graph/[id]/family-chart-view.tsx`
- **Issues encountered**:
  - Blank view (container ref null due to conditional rendering)
  - "child has more than 1 parent" error
  - SVG not filling container (300x150 default)
  - Names not showing (wrong data access path)
  - Cards overlapping even with increased spacing

### 3. d3-dtree (v2.4.1) - CURRENT APPROACH
- **Status**: Active implementation
- **Pros**:
  - Designed for family trees with multiple parents
  - Shows individuals separately with marriage connectors
  - Built-in zoom/pan
  - Supports marriages array for spouse connections
- **Cons**: Requires lodash + D3 v4 loaded globally
- **Files**: `src/lib/dtree-transform.ts`, `src/app/graph/[id]/dtree-view.tsx`

### 4. Simple D3 Tree (custom)
- **Status**: Alternative approach for combined-couple view
- **Pros**: Full control, matches original JSON format exactly
- **Cons**: Less sophisticated layout, no built-in marriage lines
- **Files**: `src/app/graph/[id]/simple-tree-view.tsx`

### 5. topola-js
- **Status**: Investigated but not implemented
- **Pros**: GEDCOM-based, standard genealogy format
- **Cons**: Family-centric model (requires synthesizing family records), gender binary

## Current Implementation (DTreeView)

### Architecture
```
graph-view-toggle.tsx
  └── DTreeView (tree view)
  └── PersonList (list view)

DTreeView loads:
  - D3 v4 (via CDN)
  - lodash (via CDN)
  - d3-dtree (via CDN)

transformToDTreeData() converts:
  Person[] + Relationship[] → DTreeNode[]
```

### Transform Logic (`transformToDTreeData`)

1. **Build lookup maps** for persons, parent-child, and spouse relationships
2. **Find root persons** (those with no parents in the data)
3. **Select best root** (person with most descendants)
4. **Build tree recursively**:
   - Each person becomes a node
   - Spouses are added to `marriages` array
   - Shared children are nested under the marriage
   - Handles single-parent children separately

### Node Display
- Name (display_name)
- Lifespan (birth year - death year)
- Pronouns (if set)

### Visual Design
- Dark theme: bg `#0a1410`, accent `#7fdb9a`
- Green border nodes with gradient background
- Marriage lines connecting spouses
- Pan/zoom support

## Two Display Options

### Option 1: Separate Nodes with Marriage Lines (Current - DTreeView)
- Each person is their own box
- Spouses connected by a horizontal line
- Children descend from the marriage connection
- **Pros**: Shows individuals clearly, matches data model
- **Cons**: Takes more horizontal space

### Option 2: Combined Couple Nodes (SimpleTreeView)
- Couples shown as single box: "John McGinty & Margaret Kirk"
- Matches the original exported JSON format
- **Pros**: More compact, familiar genealogy format
- **Cons**: Loses individual identity, harder to show remarriages

### Future: Option Toggle
Consider adding a toggle to switch between display modes.

## Known Issues / TODO

### Critical: TreeDown Import Name Deduplication Bug
The TreeDown importer (`import-treedown.ts`) deduplicates persons by exact display name. This causes problems when two people have the same name (e.g., "John McGinty" appears twice in the McGinty tree - once as the 1870 patriarch and once as a 1925 descendant). Both get merged into one person record with relationships from BOTH, creating incorrect parent-child links.

**Impact**: John McGinty (1870) is incorrectly recorded as having parents Thomas Kirk McGinty and Helen O'Kane (who are actually his grandchildren's generation).

**Workaround**: Root selection now prefers Margaret Kirk (John's wife) who IS a correct root with proper descendants.

**Fix needed**: The importer should either:
1. Preserve birth dates in the Person record and use them for disambiguation
2. Append a disambiguator to duplicate names (e.g., "John McGinty (1870)", "John McGinty (1925)")
3. Generate unique names based on lineage context

### Other Issues
1. **Birth dates not imported** - The TreeDown parser strips all parenthesized metadata including dates. The `ImportedPerson` interface only has `tempId` and `displayName`.
2. **Card content** - Cards should show more info like the original format (dates, locations)
3. **Marriage visualization** - May need to enhance how couples are visually grouped (box around them, special styling)
4. **Performance** - Not yet tested with full 214-person tree rendering

## File Inventory

### Core Files
- `src/app/graph/[id]/graph-view-toggle.tsx` - View mode switcher
- `src/app/graph/[id]/simple-tree-view.tsx` - **ACTIVE** D3 tree with combined couples (working!)
- `src/lib/dtree-transform.ts` - Transform functions (`transformToHierarchicalTree` for SimpleTreeView)

### Alternative Implementations (kept for reference)
- `src/app/graph/[id]/dtree-view.tsx` - dTree-based view (had issues with data format)
- `src/app/graph/[id]/family-chart-view.tsx` - family-chart attempt
- `src/lib/family-chart-transform.ts` - family-chart transform

### Original (pre-library attempts)
- `src/app/graph/[id]/tree-view.tsx` - Original relatives-tree view
- `src/lib/tree-transform.ts` - Original transform

## Git Commits (Recent)

```
2fd3cad Switch back to DTreeView for proper parent display
f21bb6e Add SimpleTreeView with combined couple nodes
e57b9bf WIP: Add dTree and family-chart tree visualization experiments
2cb740d Add interactive tree visualization with pan/zoom and cycle-safe layout
```

## Next Steps

1. ✅ **Root selection fixed** - Margaret Kirk & John McGinty now display as root (workaround for name dedup bug)
2. ✅ **Fix TreeDown importer** - Added birth_date/death_date extraction and changed dedup key to name+birthYear
3. **Re-import data** - Delete corrupted data and re-import with fixed importer
4. **Enhance card display** - Show more info (dates, locations) matching original format
5. **Improve couple visualization** - Add visual grouping (box, background) for married couples
6. **Performance testing** - Verify 214-person tree renders without issues
7. **Remove debug logging** - Clean up console.log statements after verification

## Design Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Keep separate Person records | Matches existing data model, supports complex relationships | Existing |
| Use dTree library | Only library that properly supports two parents per child | 2024-02 |
| Show parents as separate nodes | Maintains data model integrity, user can see individuals | 2024-02 |
| Visual marriage connection | Indicates union without merging data | 2024-02 |
| Keep SimpleTreeView as option | Some users may prefer combined-couple format | 2024-02 |
| Use SimpleTreeView as primary | dTree library had data format issues (_sortMarriages error) | 2025-02-05 |
| Reverse-alpha tiebreaker for roots | Workaround for name dedup bug - ensures Margaret Kirk selected over Helen O'Kane | 2025-02-05 |
| Dedup by name+birthYear | Fixes merging of same-named people with different birth years | 2025-02-05 |
| Extract dates during import | Preserves birth/death dates from TreeDown parenthesized metadata | 2025-02-05 |

## Contact / Context

- **Project**: Family Connections (family tree visualization)
- **Tech Stack**: Next.js 16, Supabase, TypeScript, Tailwind CSS 4
- **Main CLAUDE.md**: See project root for full context
