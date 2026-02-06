# Chore 002: Remove Unused Tree Visualization Libraries

**Status:** In Progress
**Branch:** `chore/002-remove-unused-deps`
**PRs:** (link PR here)

## Summary

Remove four unused tree visualization npm packages and their associated dead code. Only `SimpleTreeView` (custom D3 component) is actively used.

## Motivation

These packages were explored during development but never shipped. They add unnecessary weight to `node_modules` and create lint warnings in dead code files.

## What's Being Removed

### npm packages (from dependencies)
- `d3-dtree` — d3-based tree library, loaded via CDN in `dtree-view.tsx`
- `family-chart` — family chart library, used in `family-chart-view.tsx`
- `relatives-tree` — tree layout calculator, used in `tree-view.tsx`
- `topola` — not imported anywhere

### Dead code files
- `src/app/graph/[id]/dtree-view.tsx` — unused alternate view
- `src/app/graph/[id]/tree-view.tsx` — unused alternate view
- `src/app/graph/[id]/family-chart-view.tsx` — unused alternate view
- `src/lib/tree-transform.ts` — only used by `tree-view.tsx`
- `src/lib/family-chart-transform.ts` — only used by `family-chart-view.tsx`

### Kept
- `src/lib/dtree-transform.ts` — used by `simple-tree-view.tsx` (the active component)
- `TREE_VISUALIZATION_DESIGN.md` — documents design decisions (kept for reference)

## Acceptance Criteria

- [ ] Four packages removed from package.json
- [ ] Five dead code files deleted
- [ ] `simple-tree-view.tsx` still works (imports from `dtree-transform.ts` unaffected)
- [ ] Lint warnings reduced (fewer unused-var warnings)
- [ ] All tests pass, build succeeds

---
*Created: 2026-02-06*
