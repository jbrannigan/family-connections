# Feature 021: Warn About Circular Relationships

**Status:** Complete (v0.13.0, PR #22)
**Branch:** `feat/021-circular-relationship-warning`
**Priority:** 1

## Summary

Prevent users from creating impossible circular ancestor chains (e.g., Person A is the parent of Person B who is the parent of Person A) by detecting cycles in the parent-child graph before inserting new relationships.

## Motivation

Without cycle detection, users can create logically impossible family trees where someone is their own ancestor. This corrupts the tree visualization and breaks hierarchy-based features like breadcrumbs, ancestor/descendant views, and kinship calculations.

## Scope

### In Scope
- Server-side cycle detection for parent-type relationships
- BFS-based ancestor traversal to detect transitive cycles
- Clear error message when a cycle is detected
- Unit tests for the cycle detection function

### Out of Scope
- Client-side pre-flight cycle check (server-side is sufficient)
- Cycle detection for spouse relationships (bidirectional by nature)
- Detecting/fixing existing cycles in the database

## Design

### Technical Approach
- Reuse existing `extractParentEdges()` and `buildAdjacency()` from `relationships.ts`
- New `wouldCreateCycle(parentId, childId, relationships)` pure function
- BFS walks upward from the proposed parent — if it reaches the proposed child, a cycle would be created
- Called in `createRelationship()` server action for parent types only

### Database Changes
None.

## Acceptance Criteria

- [x] `wouldCreateCycle()` detects direct cycles (A→B, B→A)
- [x] `wouldCreateCycle()` detects indirect cycles (A→B→C, C→A)
- [x] `wouldCreateCycle()` detects deep cycles (5+ person chain)
- [x] `wouldCreateCycle()` returns false for valid relationships
- [x] `wouldCreateCycle()` ignores spouse relationships
- [x] Server action throws descriptive error when cycle detected
- [x] Error displays in the UI via existing error handling
- [x] Unit tests pass
- [x] TypeScript strict, lint clean, build passes

## Test Plan

### Unit Tests
- Direct cycle: A→B exists, adding B→A → true
- Indirect 3-person: A→B, B→C, adding C→A → true
- Deep cycle: 5-person chain, last→first → true
- Self-relationship → true
- Multiple parents (no cycle) → false
- Unrelated persons → false
- Spouse relationships ignored → false
- Mixed parent types (adoptive, step) → detected
- Empty relationships → false

---
*Created: 2026-02-08*
