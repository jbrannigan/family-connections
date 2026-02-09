# Feature 020: Validate Date Formats on Input

**Status:** Complete (v0.13.0, PR #21)
**Branch:** `feat/020-date-input-validation`
**Priority:** 1

## Summary

Add client-side inline validation to date input fields on the person edit form, giving users immediate feedback when they enter invalid date formats.

## Motivation

Currently, date validation only happens server-side after clicking Save. Users get no feedback until submission fails with a generic error. This creates a poor UX, especially for the supported ISO 8601 reduced precision format (YYYY, YYYY-MM, YYYY-MM-DD) which isn't intuitive.

## Scope

### In Scope
- Inline validation on blur for birth_date and death_date fields
- Contextual error messages (e.g. "Month must be 2 digits" instead of generic format error)
- Semantic validation (month 01-12, day within month range, year 1000-2100)
- Red border + error text styling on invalid fields
- Save button disabled when date errors exist
- Error clears automatically when user fixes the value

### Out of Scope
- Date picker component (keep as text input for reduced precision support)
- Cross-field validation (e.g. death after birth)
- Date validation on TreeDown import (already handled)

## Design

### Technical Approach
- New `validateDateInput()` function in `date-utils.ts` — returns descriptive error string or null
- Mirrors `normalizeDate()` format check, adds semantic validation (month/day ranges, year range)
- Contextual hints based on partial input patterns (short year, single-digit month, slashes)
- `onBlur` validation on date inputs in `person-detail.tsx`
- `dateErrors` state object tracks per-field errors
- Errors clear on `onChange` when input becomes valid

### Database Changes
None.

## Acceptance Criteria

- [x] `validateDateInput()` returns null for empty/valid inputs
- [x] `validateDateInput()` returns contextual errors for common mistakes
- [x] `validateDateInput()` catches invalid month (00, 13) and day values
- [x] Birth/death date inputs show red border + error on blur when invalid
- [x] Error clears when user fixes the value
- [x] Save button disabled when date errors exist
- [x] Server-side validation still works as safety net
- [x] Unit tests for validateDateInput pass
- [x] TypeScript strict, lint clean, build passes

## Test Plan

### Unit Tests
- Empty/whitespace → null (valid)
- Valid formats (YYYY, YYYY-MM, YYYY-MM-DD) → null
- Short year → "Year must be 4 digits"
- Single-digit month → "Month must be 2 digits"
- Slashes → "Use hyphens, not slashes"
- Month 00/13 → "Month must be between 01 and 12"
- Day out of range → per-month error
- Year <1000 or >2100 → range error

---
*Created: 2026-02-08*
