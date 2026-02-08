# Feature 014: Roles, Invite Links & Guest Mode

**Status:** Draft
**Branch:** `feat/014-roles-and-invites`
**PRs:** (link PRs here as they're created)

## Summary

Expand the permission system from 2 roles (admin/member) to 4 roles (Viewer, Contributor, Editor, Owner), replace raw invite codes with role-specific shareable links, and add a "Guest Mode" toggle so owners/editors can hand their device to someone without exposing edit controls.

## Motivation

The current admin/member split is too coarse. Family members who should be trusted to edit their own branch (e.g., updating their kids' info) can't, while admins have full destructive access to everything. At reunions, the owner might want to hand their phone to a relative to browse — but edit/delete buttons are exposed.

Three problems to solve:
1. **Missing middle ground** — need roles between "read-only" and "full control"
2. **Invite codes are unfriendly** — a 12-char hex string (`a1b2c3d4e5f6`) isn't intuitive for non-technical family members
3. **No safe device sharing** — owners can't temporarily restrict their own session

## Scope

### In Scope
- 4-tier role system: Viewer, Contributor, Editor, Owner
- Database migration: expand `member_role` enum, update RLS policies
- Role-specific invite links (shareable URLs that assign a role on join)
- QR code generation for invite links (reunion-friendly)
- Guest Mode toggle with PIN lock
- Invite link management UI for Owner/Editor (create, copy, show QR)
- Update all existing permission checks to use new roles
- Migrate existing data: `admin` → `owner`, `member` → `viewer`

### Out of Scope
- Contributor "linked person" scoping (editing radius) — future enhancement
- Invite link expiration / one-time-use — future enhancement
- Member management UI (promote/demote/remove) — future enhancement
- Email invitations — keep it link/QR based for now

## Design

### Role Hierarchy

| Role | Description | Typical person |
|------|-------------|----------------|
| **Owner** | Full control. Manage members, import/export, delete graph. One per graph (the creator). | You (Jim) |
| **Editor** | Can edit any person, relationship, or story in the tree. Cannot import/export or manage members. | A trusted family member you designate (e.g., your sister who helps maintain the tree) |
| **Contributor** | Can edit their own stories. Can suggest edits (future). Read-only for tree structure. | Most family members who join |
| **Viewer** | Read-only. Browse tree, read stories, search. Cannot modify anything. | Casual visitors, kids, people just checking it out |

### Permission Matrix

| Action | Owner | Editor | Contributor | Viewer |
|--------|-------|--------|-------------|--------|
| View tree, persons, stories | Y | Y | Y | Y |
| Search, navigate, use keyboard shortcuts | Y | Y | Y | Y |
| Add stories to any person | Y | Y | Y | - |
| Edit/delete own stories | Y | Y | Y | - |
| Add persons | Y | Y | - | - |
| Edit any person | Y | Y | - | - |
| Delete persons | Y | Y | - | - |
| Add/edit/delete relationships | Y | Y | - | - |
| Import TreeDown | Y | - | - | - |
| Export (txt/JSON) | Y | - | - | - |
| Create/manage invite links | Y | Y | - | - |
| Change member roles | Y | - | - | - |
| Delete graph | Y | - | - | - |
| Activate Guest Mode | Y | Y | - | - |

### Invite Links

**Replace raw codes with shareable URLs:**

Current: `a1b2c3d4e5f6` (user must know to go to `/dashboard/join` and type it)

New: `https://familyconnections.app/join/a1b2c3d4e5f6?role=contributor`

- The URL lands on a **join page** showing:
  - Graph name and who created it
  - "You'll join as a **Contributor**" (or Viewer, etc.)
  - "Join" button (requires login/signup first if not authenticated)
- Owner/Editor can generate links for specific roles:
  - "Invite as Viewer" → link assigns Viewer role
  - "Invite as Contributor" → link assigns Contributor role
  - Editor can only invite Viewers and Contributors (not Editors)
  - Owner can invite any role
- Invite link renders as a **QR code** in a modal — point phone camera, scan, join

**The raw code still works** as a fallback (joins as Viewer by default). The existing `/dashboard/join` page stays functional.

**Invite link format:**
```
/join/<invite_code>?role=viewer|contributor|editor
```

The `role` parameter is validated server-side. If someone tampers with it (changes `viewer` to `owner`), the server rejects it — the invite code's associated graph has a maximum allowed role per link, enforced by a new `invite_links` table or signed parameter.

### Signed Invite Tokens

To prevent role tampering, invite links use a signed token approach:

```
/join/<token>
```

Where `token` is stored in a new `invite_links` table:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| graph_id | uuid | FK → family_graphs |
| token | text | Unique, URL-safe random string (e.g., 16 chars) |
| role | member_role | Role assigned when someone uses this link |
| created_by | uuid | FK → auth.users (who created this link) |
| label | text | Optional label (e.g., "Reunion 2026 link") |
| created_at | timestamptz | When created |

This way, each invite link has a fixed role baked in. No query parameter tampering possible.

### Guest Mode

**UI-level read-only toggle for device sharing:**

1. Owner/Editor taps a **shield icon** (🛡) in the header → "Enter Guest Mode"
2. UI immediately hides all edit/delete/import/export controls
3. A persistent banner appears: **"Guest Mode — Read Only"** with an **"Exit"** button
4. To exit, user taps "Exit" → enters their **4-digit PIN**
5. PIN is set up on first use of Guest Mode (prompted to create one)
6. PIN is stored in the browser (localStorage, hashed) — not in the database

**Implementation details:**
- Guest Mode is a React context (`GuestModeProvider`) wrapping the graph layout
- All `isAdmin` / `isEditor` checks also check `!isGuestMode`
- PIN verification is client-side only (this isn't high-security — it's a family tree app)
- Guest Mode auto-exits when navigating away from the graph (back to dashboard)
- The `localStorage` key is scoped per user: `guest_pin_<userId>_hash`

**Why client-side PIN is sufficient:**
- The threat model is "cousin Kevin accidentally taps delete" — not a determined attacker
- Server-side permissions remain unchanged — Guest Mode is purely a UI safety net
- A tech-savvy family member could bypass it via DevTools, but they'd still hit RLS on the server

### User Experience Flow

**Inviting someone (Owner perspective):**
1. On graph page, click "Invite" button (replaces current raw code display)
2. Modal opens with role tabs: Viewer | Contributor | Editor
3. Select a role → shareable link appears with "Copy Link" and "Show QR" buttons
4. Text the link to family, or show QR code at reunion
5. Each role has its own persistent link (create once, reuse)

**Joining (Family member perspective):**
1. Receive a link via text: `familyconnections.app/join/xK9mPqR2...`
2. Tap link → see: "Join **Brannigan Family** as a **Contributor**"
3. If not logged in → "Sign in or create an account to join"
4. Click "Join" → redirected to the graph

**Guest Mode (Owner at a reunion):**
1. Tap 🛡 in header → "Enter Guest Mode"
2. First time: prompted to set a 4-digit PIN
3. Hand phone to relative → they can browse freely, no edit buttons visible
4. Get phone back → tap "Exit" → enter PIN → full controls restored

## Database Changes

### Migration 1: Expand role enum

```sql
-- Add new role values to the enum
ALTER TYPE member_role ADD VALUE 'owner';
ALTER TYPE member_role ADD VALUE 'editor';
ALTER TYPE member_role ADD VALUE 'contributor';
ALTER TYPE member_role ADD VALUE 'viewer';

-- Migrate existing data
UPDATE memberships SET role = 'owner' WHERE role = 'admin';
UPDATE memberships SET role = 'viewer' WHERE role = 'member';
```

Note: PostgreSQL doesn't allow removing enum values, so `admin` and `member` will remain in the enum but won't be used. New code should only reference the 4 new values.

### Migration 2: Invite links table

```sql
CREATE TABLE invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id uuid NOT NULL REFERENCES family_graphs ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'base64url'),
  role member_role NOT NULL DEFAULT 'viewer',
  created_by uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- Owners and editors can see their graph's invite links
CREATE POLICY "Members see invite links" ON invite_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM memberships WHERE memberships.graph_id = invite_links.graph_id AND memberships.user_id = auth.uid() AND memberships.role IN ('owner', 'editor'))
);

-- Owners and editors can create invite links
CREATE POLICY "Editors create invite links" ON invite_links FOR INSERT WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (SELECT 1 FROM memberships WHERE memberships.graph_id = invite_links.graph_id AND memberships.user_id = auth.uid() AND memberships.role IN ('owner', 'editor'))
);

-- Only owners can delete invite links
CREATE POLICY "Owners delete invite links" ON invite_links FOR DELETE USING (
  EXISTS (SELECT 1 FROM memberships WHERE memberships.graph_id = invite_links.graph_id AND memberships.user_id = auth.uid() AND memberships.role = 'owner')
);
```

### Migration 3: Update RLS policies

Update existing RLS policies on `persons`, `relationships`, `stories` to use new role names:
- Replace `role = 'admin'` with `role IN ('owner', 'editor')` for write operations
- Add contributor-level story policies
- Keep read access for all roles

### Public join route

Add `/join/[token]` to public paths in middleware so the join page is accessible before login.

## Acceptance Criteria

- [ ] Four roles exist: Owner, Editor, Contributor, Viewer
- [ ] Existing `admin` users migrated to `owner`, `member` to `viewer`
- [ ] Owner can create invite links for any role
- [ ] Editor can create invite links for Viewer and Contributor only
- [ ] Invite links work: click link → see graph name + role → join
- [ ] QR code renders for each invite link
- [ ] Raw invite code still works (joins as Viewer)
- [ ] Guest Mode toggle appears for Owner and Editor
- [ ] Guest Mode hides all edit/delete controls
- [ ] PIN is required to exit Guest Mode
- [ ] All existing permission checks updated for 4-role system
- [ ] Contributors can add and manage their own stories
- [ ] Viewers are fully read-only
- [ ] RLS policies enforce new roles at database level

## Test Plan

### Unit Tests
- `role-utils.ts` — `canEdit()`, `canManageMembers()`, `canExport()`, `canInvite()`, `getMaxInviteRole()` permission helper functions
- PIN hashing/verification utility

### Integration Tests
- Invite link creation and join flow
- Role-based UI rendering (what's visible per role)
- Guest Mode toggle and PIN verification

### E2E Tests
- Full invite flow: Owner creates link → new user joins → sees correct permissions
- Guest Mode: enter → verify read-only → exit with PIN

### Regression
- Existing admin functionality still works after migration to owner
- Existing member functionality still works after migration to viewer

## PR Breakdown

This is a large feature. Break into 3-4 PRs:

1. **PR 1: Role system + migration** — New enum values, migrate data, update RLS, update all `isAdmin` checks to use role utility functions, update TypeScript types
2. **PR 2: Invite links** — `invite_links` table, `/join/[token]` route, invite modal UI with copy link + QR code, update graph header
3. **PR 3: Guest Mode** — `GuestModeProvider` context, PIN setup/verify, shield toggle in header, banner UI
4. **PR 4: Polish** — Update user guide, CHANGELOG, README, test coverage

## Notes

- The `admin` and `member` enum values remain in PostgreSQL (can't remove enum values) but are treated as deprecated aliases. Application code maps: `admin` → `owner`, `member` → `viewer` if encountered.
- Guest Mode PIN is intentionally client-side. Server-side session management would add complexity without meaningful security benefit for this use case.
- Contributor "linked person" scoping (edit within N hops of yourself) is a great future enhancement but too complex for v1. Contributors can add stories for now; editing permissions may expand later.
- QR code generation can use a lightweight library like `qrcode` (npm) rendered as SVG.

---
*Created: 2026-02-07*
*Last updated: 2026-02-07*
