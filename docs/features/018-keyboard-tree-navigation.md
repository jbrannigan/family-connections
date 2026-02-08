# Feature 018: Keyboard Navigation in Tree View

**Status**: In Progress
**Branch**: `feat/018-keyboard-tree-navigation`
**Priority**: 1

## What

Add arrow key navigation to the SVG tree view so users can move focus through the family hierarchy with keyboard, and Enter to open person detail page.

## Why

The tree view currently only supports mouse interaction (click, scroll, drag). This makes it inaccessible to keyboard-only users and less efficient for power users browsing large trees (241+ nodes).

## Scope

- Arrow keys navigate parent/child/sibling in the tree (orientation-aware)
- Enter opens person detail page, Escape clears focus
- Single-click selects (focuses) a node, double-click opens
- Visual white highlight on focused node
- Auto-pan to keep focused node in view
- Pure traversal helpers extracted for unit testing

## Acceptance Criteria

- [ ] Arrow keys navigate correctly in vertical orientation
- [ ] Arrow keys adapt for horizontal orientation
- [ ] Enter navigates to person detail page
- [ ] Escape clears focus
- [ ] Single click focuses node (no navigation), double click opens
- [ ] Focused node has white outline indicator
- [ ] Tree auto-pans to focused node
- [ ] Keyboard nav doesn't interfere with search input
- [ ] Traversal helper unit tests pass
- [ ] TypeScript strict, lint clean, build passes

## Test Plan

- Unit tests: traversal helpers (findParent, findChild, findSibling) with edge cases
- Manual: click node → white highlight, no navigation
- Manual: arrow keys → focus moves through hierarchy
- Manual: Enter → navigates to person detail
- Manual: horizontal orientation → arrow keys mapped correctly
- Automated: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`
