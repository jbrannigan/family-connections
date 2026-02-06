# Feature 003: Person Detail/Edit Page

**Status:** In Progress
**Branch:** `feat/003-person-detail-page`
**PRs:** (link PR here)

## Summary

Add a dedicated page at `/graph/[id]/person/[personId]` for viewing and editing a person's full details. Currently, clicking a person in the tree logs to console and the list view only shows basic inline info. This is the most impactful feature for making the app usable beyond a read-only viewer.

## Motivation

Users need to view complete person information (dates, location, notes, relationships) and admins need to edit it. There is currently no way to update a person's details after initial creation or import.

## Scope

### In Scope
- Dedicated person detail page (server component + client component)
- View mode: display all person fields, relationships grouped by type, stories
- Edit mode: inline editing of person fields with date validation (admin-only)
- Server action for saving edits with validation
- Navigation: click person in tree view or list view → navigate to detail page
- Relationship links between person pages
- Shared date validation utility extracted from import form

### Out of Scope
- Adding/removing relationships from the person page
- Adding stories (read-only display only)
- Delete person
- Kinship labels (infrastructure exists, needs "reference person" concept)
- Search within person pages

## Design

### User Experience
- Click any person name (tree or list) → navigate to `/graph/[id]/person/[personId]`
- View mode by default: read-only display of all fields, relationships, stories
- Edit button (admins only) toggles inline editing
- Save validates dates and updates via server action
- Back link returns to graph view

### Technical Approach
- Server component fetches person, relationships, stories, all persons (for name resolution)
- Client component handles view/edit toggle, form state, relationship grouping
- Server action validates admin role + date formats, updates via Supabase
- `TreeDisplayNode` extended with `personIds` for tree click navigation

### Database Changes
None. Uses existing `persons`, `relationships`, `stories` tables.

## Acceptance Criteria

- [ ] `/graph/[id]/person/[personId]` renders person details
- [ ] Displays: name, pronouns, birth/death dates, location, notes, incomplete flag
- [ ] Relationships grouped into Parents, Spouses, Children with links
- [ ] Stories displayed (read-only)
- [ ] Edit button visible to admins only
- [ ] Edit mode: all fields editable, dates validated
- [ ] Save persists changes, returns to view mode
- [ ] Clicking person in tree view navigates to detail page
- [ ] Clicking person in list view navigates to detail page
- [ ] Back link returns to graph

## Test Plan

### Unit Tests
- `normalizeDate()` — valid/invalid formats, null handling
- `isValidDate()` — boolean validation
- `formatDateForDisplay()` — human-readable formatting

### Regression
- All existing 12 parser tests continue to pass

---
*Created: 2026-02-06*
