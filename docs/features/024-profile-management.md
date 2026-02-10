# Feature 024: Profile Management

**Status:** In Progress
**Branch:** `feat/024-profile-management`
**PRs:** (link PRs here as they're created)

## Summary

Add a profile management page where users can edit their display name, upload an avatar photo, and see which graphs they belong to. Replace the raw email in the dashboard header with a clickable avatar + name linking to the profile page.

## Motivation

Users currently have no way to personalize their identity in the app. The `profiles` table exists but display names are set from email at signup and never editable. Avatar URLs are stored but never populated. At family reunions, seeing real names and photos instead of email addresses makes the experience more personal.

## Scope

### In Scope
- Profile page at `/dashboard/profile` with display name editing
- Avatar upload via Supabase Storage (JPEG, PNG, WebP, max 2MB)
- Avatar delete functionality
- List of user's graphs with roles on profile page
- Dashboard header: clickable avatar + display name linking to profile
- Shared `UserAvatar` component for consistent avatar rendering
- Update members modal to show avatars

### Out of Scope
- Email/password change (handled by Supabase Auth, not profile)
- Avatar cropping/editing
- Person avatars in the tree (separate feature)
- Profile visibility settings / privacy controls

## Design

### User Experience
1. Dashboard header shows a small circular avatar (or initial) + display name, clickable to `/dashboard/profile`
2. Profile page has two sections:
   - **Profile info**: avatar preview (large), upload button, display name input, save button
   - **Your graphs**: read-only list of graphs with role badges
3. Avatar upload: click to select file, immediate upload with loading state, replaces current avatar
4. Back link to dashboard at top of page

### Technical Approach
- Supabase Storage bucket `avatars` (public) with RLS policies scoped to `auth.uid()`
- Client-side upload via `supabase.storage.from('avatars').upload()` — no server action needed for file upload
- Server actions for `getProfile()`, `updateProfile()`, `deleteAvatar()`
- After upload, update `profiles.avatar_url` with the public URL
- Shared `UserAvatar` component used in: dashboard header, profile page, members modal

### Database Changes
- **New**: Supabase Storage bucket `avatars` with RLS policies (INSERT/UPDATE/DELETE restricted to own folder)
- **No schema changes**: `profiles.avatar_url` column already exists

## Acceptance Criteria

- [ ] User can navigate to profile page from dashboard header
- [ ] User can edit their display name and save it
- [ ] User can upload an avatar image (JPEG/PNG/WebP, max 2MB)
- [ ] User can delete their avatar
- [ ] Dashboard header shows avatar + display name instead of email
- [ ] Members modal shows avatars instead of initial letters
- [ ] Profile page shows list of user's graphs with roles
- [ ] Typecheck, lint, and build all pass

## Test Plan

### Unit Tests
- `UserAvatar` component renders image when URL provided, initials when not

### Integration Tests
- None (profile form interactions are straightforward CRUD)

### Manual Tests
- Upload avatar, verify it appears in dashboard header and members modal
- Edit display name, verify it updates everywhere
- Delete avatar, verify fallback to initials
- Try uploading oversized file, verify error message

## Notes

This is the first feature using Supabase Storage. The bucket and RLS patterns established here will be reused for future file upload features (e.g., person photos, document attachments).

---
*Created: 2026-02-09*
*Last updated: 2026-02-09*
