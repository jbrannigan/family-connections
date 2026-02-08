# Feature 016: Mobile Responsiveness

**Status:** In Progress
**Branch:** `feat/016-mobile-responsiveness`

## Summary

Fix mobile layout and touch target issues across all pages. Key problems: graph page toolbar overflow, header crowding on narrow screens, undersized touch targets, and fixed-width elements that cause horizontal scrolling.

## Motivation

The app will be used at family reunions on phones. The current layout works on desktop but several key areas overflow or are too cramped on screens under 480px. Touch targets on many buttons are below the 44px minimum.

## Scope

### In Scope
- Graph page header toolbar wrapping (5+ buttons overflow)
- Tree settings button groups (orientation, connections, node style overflow)
- Dashboard/graph headers (email + nav items crowd)
- Touch target sizing (minimum 44px on mobile)
- Fixed-width form elements (pronouns w-40, etc.)
- Tree view container height on mobile
- Person detail page header/edit form spacing

### Out of Scope
- Touch gestures for tree navigation (pinch-to-zoom, swipe) — future enhancement
- Mobile-specific navigation (hamburger menu, bottom nav) — future enhancement
- PWA/offline support — future enhancement

## Key Fixes

1. **Graph page toolbar**: Add `flex-wrap`, responsive gap, stack on mobile
2. **Tree settings**: Icon-only buttons on mobile, flex-wrap on button groups
3. **Headers**: Hide email on mobile, flex-wrap header items
4. **Touch targets**: `py-2.5 sm:py-2` pattern for all interactive elements
5. **Form layouts**: `w-full sm:w-40` pattern for fixed-width inputs
6. **Tree container**: `min-h-[400px] sm:min-h-[600px]`

---
*Created: 2026-02-07*
