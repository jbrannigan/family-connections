# Feature 022: Detect and Merge Duplicate Persons

**Status:** Complete (v0.14.0, PR #23)
**Branch:** `feat/022-detect-merge-duplicates`
**Priority:** 1

## Problem

Family trees imported via TreeDown or built manually may contain duplicate entries for the same person. These duplicates clutter the tree and create confusing relationship paths.

## Solution

Add a "Duplicates" button to the graph toolbar that scans for potential duplicates using name similarity scoring, then provides a side-by-side comparison view with one-click merge.

## Detection Algorithm

Name-part blocking to avoid O(n²) comparisons, then scoring:

| Signal | Points |
|--------|--------|
| Exact display_name (case-insensitive) | 80 |
| Same surname (parsed) | 25 |
| Same given name (parsed) | 25 |
| Nickname matches other's given name | 20 |
| Same birth year | 15 |
| Birth year within 2 years | 5 |
| Same birth location | 10 |
| One person is_incomplete | 5 |

Threshold: ≥ 40 points = potential duplicate.

## Merge Behavior

When merging person B into person A (keeping A):

1. All relationships pointing to B are reassigned to A
2. Self-referencing relationships (A was related to B) are deleted
3. Duplicate relationships (both had same relationship to third party) are deduped
4. Parent-type reassignments that would create cycles are skipped
5. Stories are transferred from B to A
6. Null metadata on A is filled from B (given_name, dates, location, etc.)
7. Notes are concatenated if both have content
8. Person B is deleted

## Files

- `src/lib/duplicate-detection.ts` — pure detection functions
- `src/lib/duplicate-detection.test.ts` — 25 unit tests
- `src/app/graph/[id]/merge-actions.ts` — server action
- `src/app/graph/[id]/duplicates-button.tsx` — toolbar button
- `src/app/graph/[id]/duplicates-modal.tsx` — modal with list + comparison views
- `src/app/graph/[id]/graph-page-client.tsx` — integration

## Access Control

- Requires `canEdit()` — Editor or Owner role
- Hidden in Guest Mode (effectiveRole = viewer)

## Acceptance Criteria

- [ ] "Duplicates" button visible for Editor+ roles
- [ ] Scanning finds persons with matching names/dates
- [ ] Side-by-side comparison shows all fields with differences highlighted
- [ ] "Keep" button merges correctly (relationships, stories, metadata)
- [ ] Merged person disappears from tree, kept person has combined data
- [ ] Cycle detection prevents invalid relationship reassignment
- [ ] All unit tests pass
