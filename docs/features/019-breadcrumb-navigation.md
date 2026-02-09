# Feature 019: Breadcrumb Showing Path from Root

**Status:** In Progress
**Branch:** `feat/019-breadcrumb-navigation`
**Priority:** 1

## Summary

Add a breadcrumb trail above the tree view that shows the path from the root ancestor down to the currently focused node. Each segment is clickable to jump to that ancestor.

## Motivation

When navigating a large family tree (241+ nodes), users lose context about where the currently focused node sits in the hierarchy. A breadcrumb trail shows lineage at a glance and provides clickable shortcuts to ancestor nodes.

## Scope

### In Scope
- Breadcrumb trail showing path from root to focused node
- Clickable ancestor segments that focus + pan to that node
- Name truncation for long couple node names
- Auto-hide when no node is focused
- Responsive horizontal scroll for deep trees

### Out of Scope
- Breadcrumb in list view (tree view only)
- Persistent breadcrumb when navigating away from tree
- Custom breadcrumb styling options

## Design

### User Experience
- When a node is focused (via click or arrow keys), a breadcrumb appears below the info bar
- Format: `Root › Parent › Current` with `›` separators
- Clicking an ancestor segment focuses and pans to that node
- The current (last) segment is styled differently (white, not clickable)
- Long couple names are shortened: "John & Margaret" instead of "John McGinty (1870-1909) & Margaret Kirk (1871-1906)"
- Escape clears focus and hides breadcrumb

### Technical Approach
- Add `buildAncestorPath()` pure function to `tree-keyboard-nav.ts`
- Add `shortenNodeName()` helper for truncating couple node names
- Add `TreeBreadcrumb` inline component in `simple-tree-view.tsx`
- Positioned absolute, below info bar, matching existing dark theme styling

### Database Changes
None.

## Acceptance Criteria

- [ ] Breadcrumb appears when a node is focused
- [ ] Breadcrumb shows full path from root to current node
- [ ] Clicking a breadcrumb segment focuses and pans to that node
- [ ] Current node segment is styled differently (white, non-clickable)
- [ ] Long names are truncated appropriately
- [ ] Breadcrumb disappears when focus is cleared (Escape)
- [ ] Breadcrumb updates when navigating with arrow keys
- [ ] Responsive: horizontal scroll for deep trees on mobile
- [ ] Unit tests for buildAncestorPath pass
- [ ] TypeScript strict, lint clean, build passes

## Test Plan

### Unit Tests
- `buildAncestorPath()`: root returns single element, child returns [root, child], grandchild returns full path, unknown node returns empty array

### Manual Tests
- Click a deep node → breadcrumb appears showing full path
- Click a breadcrumb segment → tree focuses and pans to that ancestor
- Press Escape → breadcrumb disappears
- Navigate with arrow keys → breadcrumb updates in real time
- Test with long couple node names → names are shortened

## Notes

Reuses existing `NodeMap`, `HierarchyNode` types and `setFocusedNodeId` mechanism from Feature 018.

---
*Created: 2025-02-08*
