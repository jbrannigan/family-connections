# Feature 017: Add/Remove Relationships from Person Detail Page

**Status**: In Progress
**Branch**: `feat/017-relationship-management`
**Priority**: 1

## What

Add the ability to create and delete relationships directly from the person detail page (`/graph/[id]/person/[personId]`). Currently, relationships are display-only on this page.

## Why

The person detail page is the natural place to manage a person's relationships. Currently, the only place to add relationships is the list view's inline card forms, and there's no way to delete individual relationships at all.

## Scope

- **Add Relationship**: Inline form on person detail page (view mode) with type dropdown, direction selector (for parent types), and searchable person combobox
- **Remove Relationship**: Inline confirmation on each displayed relationship (unions, parents, children)
- **Server Actions**: `createRelationship` and `deleteRelationship` with proper auth/permission checks

## Acceptance Criteria

- [ ] Editors can add relationships from person detail page
- [ ] Direction is clear for parent types (who is parent vs child)
- [ ] Person selector is searchable (works for 241+ person graphs)
- [ ] Editors can remove any relationship with inline confirmation
- [ ] Duplicate relationships show friendly error message
- [ ] Non-editors don't see add/remove controls
- [ ] TypeScript strict, lint clean, build passes

## Test Plan

- Manual: add parent relationship, verify it appears, remove it, verify it's gone
- Manual: add spouse relationship, verify no direction selector shown
- Manual: try adding duplicate, verify friendly error
- Automated: `npx tsc --noEmit`, `npm run lint`, `npm run build`
