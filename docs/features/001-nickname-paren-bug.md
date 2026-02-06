# Fix 001: Nickname Parentheses Stripped by stripMetadata()

**Status:** In Progress
**Branch:** `fix/001-nickname-paren-bug`
**PRs:** (link PR here)

## Summary

The `stripMetadata()` function in the TreeDown parser strips the closing paren from nicknames like `(Peggy)`, even though `isNickname()` correctly identifies them. This causes names like `Margaret (Peggy) McGinty` to become `Margaret (Peggy McGinty` instead of preserving the nickname.

## Root Cause

In `stripMetadata()`, after correctly preserving nickname parenthesized groups (line 149-151), a cleanup step on line 163 runs `.replace(/\)/g, "")` which removes **all** closing parens — including the ones that were just preserved as part of nicknames.

## Fix

Replace the blanket stray-paren removal with a targeted approach: only remove closing parens that are not part of balanced parenthesized groups in the result string.

## Acceptance Criteria

- [ ] `Margaret (Peggy) McGinty (1933-2024)` → display name `Margaret (Peggy) McGinty`
- [ ] `Katherine (Kate) McGinty (1870-1953)` → display name `Katherine (Kate) McGinty`
- [ ] Metadata still stripped correctly: dates, marriage info, divorce markers
- [ ] The `.todo` test in import-treedown.test.ts passes
- [ ] All existing tests continue to pass

## Test Plan

### Unit Tests
- Convert `.todo` test to active test with specific nickname assertions
- Add additional test case for nickname + dates + spouse combination

### Regression
- All 10 existing parser tests must continue to pass

---
*Created: 2026-02-06*
