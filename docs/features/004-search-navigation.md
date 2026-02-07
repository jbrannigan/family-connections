# Feature 004: Search & Navigation

**Status:** In Progress
**Branch:** `feat/004-search-navigation`
**PRs:** (link PRs here as they're created)

## Summary

Add a search box to the graph page that filters persons in list view and pans+zooms to a person in tree view. With 241 people in the Brannigan Family graph, finding someone by scrolling is painful — search is essential for usability at scale.

## Motivation

Users currently have no way to quickly find a specific person in either the tree or list view. The only options are scrolling through 241 alphabetically sorted cards in list view or visually scanning the tree. Search is the highest-impact usability improvement.

## Scope

### In Scope
- Shared search input above the view toggle (persists when switching views)
- Real-time list view filtering with result count ("X of Y persons")
- Match highlighting in list view (green accent on matched text)
- Tree view search dropdown with matching persons
- Pan+zoom to selected person in tree view with brief highlight
- Cmd+K / Ctrl+K keyboard shortcut to focus search
- Escape to clear and blur search
- Clear (X) button

### Out of Scope
- Server-side search
- Search by relationship ("parents of X")
- Fuzzy or phonetic matching (phase 1 = case-insensitive substring)
- Keyboard arrow navigation within tree
- Debouncing (unnecessary for current dataset size)

## Design

### User Experience

**List View:** Type in search → cards filter in real-time. Header shows "Family Members (X of Y)". Matched text highlighted in green. Clear button (X) resets. Zero results shows "No persons found" message.

**Tree View:** Type in search → dropdown appears below input showing matching persons. Click a result → tree smoothly pans and zooms to that node with a brief white highlight flash (2 seconds). Dropdown closes after selection.

**Keyboard:** Cmd+K (Mac) or Ctrl+K (Windows/Linux) focuses the search input from anywhere on the page. Escape clears the search and blurs the input.

### Technical Approach

- Search state (`searchQuery`) lives in `graph-view-toggle.tsx` as a single source of truth
- Pure `searchPersons()` utility in `src/lib/search.ts` for testability
- `SearchInput` component handles input UI, keyboard shortcuts, and dropdown
- `SimpleTreeView` exposes `focusOnPerson(personId)` via `React.forwardRef` + `useImperativeHandle`
- D3 zoom behavior and node positions stored in refs for programmatic zoom control

### Database Changes

None.

## Acceptance Criteria

- [ ] Search input visible on graph page between view toggle and content
- [ ] Typing filters person cards in list view in real-time
- [ ] Result count shows "X of Y persons" in list view
- [ ] Matched text highlighted in accent color in list view
- [ ] In tree view, typing shows dropdown of matching persons
- [ ] Clicking dropdown result pans+zooms tree to that node
- [ ] Target node briefly highlights after pan/zoom
- [ ] Cmd+K / Ctrl+K focuses search input
- [ ] Escape clears search and blurs input
- [ ] Clear (X) button clears search query
- [ ] Search query persists when switching views
- [ ] Empty search shows all persons
- [ ] Zero results shows "No persons found" in list view
- [ ] All existing tests pass, build succeeds

## Test Plan

### Unit Tests
- `searchPersons()` — empty query, case insensitivity, partial matching, no matches, match ranges, prefix priority

### Integration Tests
- None (component behavior verified via manual smoke tests)

### E2E Tests
- None for initial PR (follow-up)

### Regression
- Existing tree click navigation must still work after forwardRef refactor

## PR Breakdown

Single PR — scope is manageable in one review.

## Notes

- All 241 persons are already loaded client-side — no server calls needed for search
- D3 coordinate system: `node.y` = horizontal position, `node.x` = vertical (standard D3 tree convention)
- Couple nodes have 2 personIds; searching for either person finds the same node

---
*Created: 2026-02-06*
*Last updated: 2026-02-06*
