# Feature 011: Ancestor & Descendant View

**Status:** In Progress
**Branch:** `feat/011-ancestor-descendant-view`
**PRs:** (link PR here when created)

## Summary

Add "Ancestors" and "Descendants" view modes to the tree visualization. Users select a person, then see only that person's direct ancestral line (ascending pedigree) or only their descendants.

## Motivation

With 241 people in the Brannigan family tree, the full tree can be overwhelming. Users often want to answer "Where did I come from?" (ancestor view) or "Who are all of Dad's descendants?" (descendant view). These focused views make it easy to trace a specific lineage without visual clutter.

## Scope

### In Scope
- Tree mode selector in toolbar: Full Tree / Ancestors / Descendants
- Search-to-select a focus person when in ancestor or descendant mode
- Ancestor tree: focus person as root, parents fanning out below as couple nodes
- Descendant tree: focus person as root, children fanning out below
- All existing tree settings (orientation, connection style, node style) work in all modes
- Focus person indicator with clear button

### Out of Scope
- Highlighting the lineage path within the full tree (future feature)
- Showing siblings of direct ancestors (fan chart)
- Person detail page integration (e.g., "View Ancestors" button)
- Persisting view mode across page loads

## Design

### User Experience
1. User is on the graph page viewing the tree
2. User clicks "Ancestors" or "Descendants" in the toolbar
3. Tree area shows a prompt: "Search for a person to view their [ancestors/descendants]"
4. User searches and selects a person from the search dropdown
5. Tree re-renders showing only the relevant subset
6. A pill shows the focus person's name with an X to clear
7. User can switch modes or click "Full Tree" to return to the complete tree

### Technical Approach
- New `transformToAncestorTree()` and `transformToDescendantTree()` functions in `dtree-transform.ts`
- Extract shared map-building logic into `buildTreeMaps()` helper (refactor, no behavior change)
- Ancestor tree inverts the parent-child direction: parents become "children" in the data structure
- `treeViewMode` and `focusPersonId` are ephemeral React state in `graph-view-toggle.tsx`
- `simple-tree-view.tsx` dispatches to the correct transform based on props

### Database Changes
None.

## Acceptance Criteria

- [ ] Tree mode selector shows three options: Full Tree, Ancestors, Descendants
- [ ] Selecting Ancestors/Descendants shows prompt to search for a person
- [ ] After selecting a person, ancestor tree shows only their direct lineage (parents, grandparents, etc.)
- [ ] After selecting a person, descendant tree shows only their descendants
- [ ] Spouses of ancestors/descendants appear as couple nodes
- [ ] All orientation/connection/node style settings work in all view modes
- [ ] Focus person indicator shows the selected person's name with a clear button
- [ ] Clearing the focus person returns to the prompt state
- [ ] Clicking "Full Tree" returns to the complete tree
- [ ] Person with no parents shows only themselves in ancestor view
- [ ] Person with no children shows only themselves in descendant view

## Test Plan

### Unit Tests
- `transformToAncestorTree()` — 9 test cases covering edge cases, lineage filtering, couple nodes
- `transformToDescendantTree()` — 6 test cases covering specified root, filtering, couple nodes
- `transformToHierarchicalTree()` — regression test after `buildTreeMaps` refactor

### Integration Tests
- Not needed for this PR (transform functions are pure, UI is straightforward)

### E2E Tests
- Not needed for this PR (manual visual testing sufficient)

### Regression
- Existing full tree must continue to work identically after refactor

## PR Breakdown

Single PR — scope is focused and self-contained.

## Notes

- The ancestor tree structure places the focus person at the root and parents as "children" in the D3 data. This means the person appears at the top (vertical) or left (horizontal), with ancestors fanning out — a natural pedigree chart layout.
- Only direct biological/adoptive/step parents are traversed. Spouses of ancestors are included as couple nodes but their own parents are NOT recursed into.

---
*Created: 2026-02-07*
*Last updated: 2026-02-07*
