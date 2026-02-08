# Feature 015: Graph Settings

**Status:** Complete
**Branch:** `feat/015-graph-settings`

## Summary

Add a settings modal to the graph page for Owners to rename the graph, manage members (view, promote/demote, remove), transfer ownership, and delete the graph.

## Motivation

With the 4-tier role system (Feature 014) in place, there's no UI for Owners to manage their graph's members — they can invite people but can't change roles, remove members, rename the graph, or delete it. This feature closes that gap.

## Scope

### In Scope
- Settings modal with 3 tabs: General, Members, Danger Zone
- Rename graph
- View all members with roles
- Change member roles (editor/contributor/viewer)
- Remove members
- Transfer ownership to another member
- Delete graph with typed confirmation

### Out of Scope
- Graph description/bio field — future enhancement
- Member activity history — future enhancement
- Bulk role changes — unlikely needed for family-sized groups
- Email notifications on role changes — future enhancement

## Design

### Settings Modal (Owner only)

Accessible via ⚙️ button in graph header. Three tabs:

**General Tab:**
- Text input to rename the graph
- Save button with success feedback

**Members Tab:**
- List of all members with display name, role badge, and actions
- Owner row shows "(you)" with no actions
- Other members: role dropdown (Editor/Contributor/Viewer) + Remove button
- Inline remove confirmation

**Danger Zone Tab:**
- Transfer Ownership: select a member, confirm dialog
- Delete Graph: typed confirmation (must match graph name), red delete button

### Permission Matrix

| Action | Owner | Editor | Contributor | Viewer |
|--------|-------|--------|-------------|--------|
| See Settings button | Y | - | - | - |
| Rename graph | Y | - | - | - |
| View members | Y | - | - | - |
| Change member roles | Y | - | - | - |
| Remove members | Y | - | - | - |
| Transfer ownership | Y | - | - | - |
| Delete graph | Y | - | - | - |

## Database Changes

### Migration: Add missing RLS policies

```sql
-- Allow owners to see all memberships in their graphs
CREATE POLICY "Owners see graph memberships"
  ON memberships FOR SELECT USING (
    graph_id IN (
      SELECT graph_id FROM memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Allow owners to delete their graphs
CREATE POLICY "Owners delete graphs"
  ON family_graphs FOR DELETE USING (auth.uid() = owner_id);
```

No new tables. Existing UPDATE/DELETE RLS policies on `memberships` already support owner-only member management.

## Acceptance Criteria

- [ ] Settings button (⚙️) visible only to Owner
- [ ] General tab: rename graph with validation
- [ ] Members tab: list all members with roles
- [ ] Members tab: change member roles via dropdown
- [ ] Members tab: remove members with confirmation
- [ ] Danger Zone: transfer ownership with confirmation
- [ ] Danger Zone: delete graph with typed confirmation
- [ ] Owner cannot change own role or remove self
- [ ] Owner cannot promote anyone to owner (use Transfer instead)
- [ ] After transfer: former owner becomes editor, settings button disappears
- [ ] After delete: redirect to dashboard, graph is gone
- [ ] All actions enforced server-side (not just UI)

## Test Plan

### Manual Testing
- Rename graph → name updates in header
- Change member role → role badge updates
- Remove member → member disappears from list
- Transfer ownership → roles swap, settings button disappears
- Delete graph → typed confirmation, redirect to dashboard
- Non-owner cannot see Settings button

### Regression
- Existing invite, export, import, guest mode features still work
- All 181 existing tests pass

---
*Created: 2026-02-07*
