# Feature 023: Undo/Redo for Edits

**Status:** In Progress
**Priority:** 1 (Essential)
**Branch:** `feat/023-undo-redo`

## Summary

Session-scoped undo/redo for person edits, relationship changes, and story mutations. Uses in-memory stacks with toast notifications and Cmd+Z / Cmd+Shift+Z keyboard shortcuts. No database changes required.

## Scope

### Undoable
- Update person fields
- Create/delete relationships
- Create/update/delete stories
- Add person (from list view)
- Add relationship (from list view)

### Not Undoable
- Merge persons (too complex, multi-step)
- Delete graph (irreversible)
- Import (bulk operation)
- Transfer ownership (irreversible)

## Design

- **UndoProvider** React Context wraps graph and person detail pages
- **Page-scoped** history — resets on navigation between pages
- **Max 20 entries** in undo stack
- **Toast + keyboard** UI (Gmail pattern)
- **Before-state snapshots** captured client-side before server action calls
- **Restore actions** for undoing deletes (bypass validation)

## Acceptance Criteria

- [ ] Edit a person → toast appears → click Undo → edit reverted
- [ ] Cmd+Z undoes last action, Cmd+Shift+Z redoes
- [ ] Cmd+Z inside text input performs native undo (not our undo)
- [ ] Add relationship → undo removes it → redo re-adds it
- [ ] Delete story → undo restores it
- [ ] Undo stack capped at 20 entries
- [ ] History clears on page navigation

## Test Plan

- Unit tests for stack logic (~10 tests)
- Manual testing of each undoable mutation
- Keyboard shortcut edge cases (text inputs, processing state)
