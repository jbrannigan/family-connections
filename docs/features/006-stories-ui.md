# Feature 006: Stories UI

**Status:** In Progress
**Branch:** `feat/006-stories-ui`
**PRs:** (link PRs here as they're created)

## Summary

Add full CRUD for stories on person detail pages. The `stories` table and RLS policies already exist — this feature builds the UI layer: add, edit, delete stories with author attribution, relative timestamps, and story counts on person list cards.

## Motivation

The stories table was created in the initial schema but never got a UI beyond read-only display. Family members need to contribute memories, fun facts, and anecdotes to make the tree come alive. This is especially valuable at family reunions where multiple people can add stories simultaneously.

## Scope

### In Scope
- Add story form (textarea + fun fact toggle) on person detail page
- Author-only inline editing of stories
- Author-only deletion with confirmation
- Author name and relative timestamp display on each story
- Story count indicator on person list cards
- Empty state encouraging contributions

### Out of Scope
- Rich text / markdown in stories
- Image or media attachments
- Story reactions (likes, comments)
- Story timeline view
- Story search/filter
- Admin override for editing/deleting others' stories

## Design

### User Experience
- On person detail page, any graph member sees a "Stories" section with an "+ Add Story" button
- Adding a story: textarea + "This is a fun fact" checkbox + Save/Cancel
- Each story card shows: content, Fun Fact pill (if applicable), author name, relative timestamp
- Story author sees Edit and Delete buttons on their own stories
- Delete requires inline confirmation ("Delete this story?" with Yes/Cancel)
- Person list cards show a small "N stories" indicator

### Technical Approach
- New `StorySection` client component handles all story UI
- Server actions for create/update/delete follow existing `updatePerson` pattern
- Author profiles fetched server-side (2-query approach) and passed as `StoryWithAuthor`
- `formatRelativeTime()` utility for "3 days ago" style timestamps

### Database Changes
None — the `stories` table, indexes, and RLS policies already exist.

## Acceptance Criteria

- [ ] Any graph member can add a story to any person
- [ ] Fun fact toggle works (shows green pill badge)
- [ ] Author name displayed on each story
- [ ] Relative timestamp displayed ("just now", "3 days ago", etc.)
- [ ] Only story author sees edit/delete buttons
- [ ] Edit replaces content inline with save/cancel
- [ ] Delete shows inline confirmation
- [ ] Empty state: "No stories yet" message with add button
- [ ] Person list cards show story count
- [ ] All existing tests still pass

## Test Plan

### Unit Tests
- `formatRelativeTime()` — just now, minutes, hours, days, >30 days fallback

### Manual / Visual
- Add story flow, fun fact toggle, edit, delete, author attribution, list card counts

---
*Created: 2026-02-07*
