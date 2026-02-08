# Feature 013: In-App User Guide

**Status:** In Progress
**Branch:** `chore/013-technical-debt`
**PRs:** (link PR here when created)

## Overview

Add an in-app user guide page at `/guide` aimed at non-technical family members. Covers all features of the app in a friendly, approachable format with a sticky table of contents and mobile-responsive layout.

## Motivation

Family members invited to use the app need a quick reference for how things work. The guide should be accessible without logging in (public route) so people can read it before creating an account.

## Scope

- Static server component at `/guide` (no database access)
- 13 sections covering all app features
- Sticky table of contents with anchor links (collapsible on mobile)
- Accessible from landing page and dashboard
- Matches existing dark theme styling
- No images/screenshots for v1

## Sections

1. Getting Started
2. Dashboard
3. Tree View
4. Tree Settings
5. Ancestor & Descendant View
6. List View
7. Search
8. Person Detail Page
9. Stories & Fun Facts
10. TreeDown Import (admin)
11. Export (admin)
12. Invite & Collaboration
13. Keyboard Shortcuts

## Files

- `src/app/guide/page.tsx` — Main guide page (server component)
- `src/app/guide/table-of-contents.tsx` — TOC (client component)
- `src/lib/supabase/middleware.ts` — Add `/guide` to public paths
- `src/app/layout.tsx` — Add `scroll-smooth`
- `src/app/page.tsx` — Add guide link on landing page
- `src/app/dashboard/page.tsx` — Add guide link in header

## Test Plan

- Type check, lint, build pass
- Page accessible without auth
- Anchor links scroll to correct sections
- Mobile: TOC collapses, content readable
- Guide links visible on landing page and dashboard
