# Feature 005: How Am I Related?

**Status:** Draft
**Branch:** `feat/005-how-am-i-related`
**PRs:** (link PRs here as they're created)

## Summary

Let users claim a person as themselves ("This is me"), then discover how they're related to anyone in the graph with a single click. Shows a plain-English explanation of the relationship path, highlights the connecting links in the tree, and optionally displays a QR code on person cards so reunion attendees can scan and instantly see the connection.

## Motivation

At family reunions, the most common question is "How are we related?" This feature turns the app into a live reunion tool: a user identifies themselves in the graph, then can tap any person (or scan their QR card) to get an instant, natural-language answer like:

> **She is your 1st cousin.**
> Your mom Peggy Brannigan was the sister of her father John McGinty.

The existing `findConnection()` utility already computes kinship labels and ancestor paths — this feature surfaces that logic in a compelling UI.

## Scope

### In Scope
- **"This is me" identity claim** — user marks a person in the graph as themselves (stored in `memberships` or a new column)
- **"How am I related?" button** on person detail page and person cards
- **Relationship result modal/panel** showing:
  - Formal kinship label (e.g., "1st cousin once removed")
  - Natural-language explanation of the path (e.g., "because your mom X is the sister of their dad Y")
  - Visual path highlight: the connecting nodes/links in the tree view
- **QR code on person cards** — each card shows a small QR code linking to that person's page; scanning opens the relationship view
- **Ascendant tree focus** — option to subset the tree to show only the ancestry path between the two people (the "lineage" or "ascendant" view)

### Out of Scope
- Multiple identity claims per user (one user = one person in one graph)
- Relationship paths through spouse connections (phase 1 = blood/adoption only, matching existing `findConnection()`)
- Photo/avatar on QR cards
- NFC or Bluetooth proximity features
- Printing physical QR cards (user can screenshot)

## Design

### User Experience

#### 1. Claiming Identity ("This is me")

- On the person detail page, admin users see a **"This is me"** button
- Alternatively, on the graph settings page, users pick their person from a dropdown
- Once claimed, the person card gets a small "You" badge
- Stored as `my_person_id` on the `memberships` row (new column)

#### 2. "How Am I Related?" Flow

- On any person card or detail page, a **"How am I related?"** button appears (only when the user has claimed an identity)
- Clicking opens a **relationship result panel** showing:
  1. **Kinship label** in large text: "She is your **1st cousin**"
  2. **Path explanation**: step-by-step through the family tree
     - "Your mother **Peggy Brannigan** is the sister of her father **John McGinty**."
     - Each name in the explanation is a clickable link
  3. **Visual path**: a simplified mini-tree or highlighted path in the main tree view
- If no connection is found: "No blood/adoptive relationship found between you and [Name]."

#### 3. Path Explanation Generation

The natural-language explanation is generated from the `ConnectionPath` returned by `findConnection()`. For each step in the path, we describe the relationship using the person's name and the relationship type:

- Path A (user → common ancestor): "Your mother X", "X's father Y", etc.
- Path B (target → common ancestor): "their mother Z", "Z's father W", etc.
- Possessive pronouns derived from the person's `pronouns` field

Example for 1st cousins:
```
Path A: [User] → [User's parent] → [Common grandparent]
Path B: [Target] → [Target's parent] → [Common grandparent]

"You and Alice Moran are 1st cousins.
Your mother Peggy Brannigan and her father John McGinty are siblings —
they are both children of James McGinty Sr."
```

#### 4. QR Codes on Person Cards

- Each person card in list view shows a small QR code in the corner
- The QR encodes a URL: `{app_url}/graph/{graphId}/person/{personId}?relate=true`
- When scanned by someone who has claimed an identity, it immediately shows the "How am I related?" result
- QR codes generated client-side using the existing `qrcode` package

#### 5. Ascendant Tree View (Lineage Focus)

- When viewing a relationship result, a **"Show in tree"** button highlights the path
- The tree view filters/dims all nodes except those in the connection path
- The connecting links are highlighted in a distinct color (e.g., white or gold)
- Alternatively, a focused mini-tree renders just the relevant lineage

### Technical Approach

#### Database Changes

**Migration: Add `my_person_id` to memberships**

```sql
ALTER TABLE memberships
ADD COLUMN my_person_id uuid REFERENCES persons(id) ON DELETE SET NULL;
```

This links a user's membership to the person they've claimed as themselves.

#### Key Components

| Component | Purpose |
|-----------|---------|
| `src/lib/relationships.ts` | Already has `findConnection()` — extend with `generatePathExplanation()` |
| `src/lib/path-explanation.ts` | New: generates natural-language explanation from `ConnectionPath` + person data |
| `src/app/graph/[id]/person/[personId]/relate-button.tsx` | New: "How am I related?" button + result panel |
| `src/app/graph/[id]/person-card-qr.tsx` | New: QR code overlay for person cards |
| `src/app/graph/[id]/claim-identity.tsx` | New: "This is me" button/dropdown |

#### Path Explanation Algorithm

```typescript
function generateExplanation(
  connection: ConnectionPath,
  persons: Map<string, Person>,
  userPersonId: string,
): string {
  // 1. Walk pathA (user → ancestor): "Your mother X"
  // 2. Walk pathB (target → ancestor): "her father Y"
  // 3. Identify the shared ancestor
  // 4. Compose: "Your mom X is the sister of her dad Y.
  //              They are both children of [common ancestor]."
}
```

The relationship labels at each step come from the `relationships` table:
- `biological_parent` where person is child → "mother/father" (based on pronouns)
- `biological_parent` where person is parent → "son/daughter"
- Same generation from common ancestor → "sibling" / "sister" / "brother"

### Database Changes

```sql
-- Add identity claim column
ALTER TABLE memberships
ADD COLUMN my_person_id uuid REFERENCES persons(id) ON DELETE SET NULL;

-- Index for quick lookup
CREATE INDEX idx_memberships_my_person ON memberships(my_person_id) WHERE my_person_id IS NOT NULL;
```

## Acceptance Criteria

- [ ] User can claim "This is me" for a person in the graph
- [ ] "How am I related?" button appears on person cards and detail pages when identity is claimed
- [ ] Clicking shows formal kinship label (e.g., "1st cousin once removed")
- [ ] Natural-language path explanation is shown with clickable person names
- [ ] Works correctly for: parent/child, grandparent, sibling, cousin (1st, 2nd, etc.), uncle/aunt, with "removed" variants
- [ ] Shows "No connection found" when people aren't blood-related
- [ ] QR code appears on person cards in list view
- [ ] Scanning QR code opens person page and triggers relationship view
- [ ] "Show in tree" highlights the connection path in the tree view
- [ ] Works with the existing 241-person Brannigan/McGinty dataset

## Test Plan

### Unit Tests
- `generatePathExplanation()` — test with various relationship types (sibling, cousin, uncle, grandparent)
- Pronoun-aware labels ("her father" vs "his father" vs "their parent")
- Edge cases: direct parent-child, same person, no connection

### Integration Tests
- "This is me" claim persists across sessions
- "How am I related?" result renders correctly
- QR code encodes correct URL

### E2E Tests
- Full flow: claim identity → navigate to relative → click "How am I related?" → see result
- QR scan flow (open encoded URL with `?relate=true`)

### Regression
- Ensure existing `findConnection()` still works correctly after any extensions

## PR Breakdown

This is a large feature. Suggested breakdown:

1. **PR 1: Identity claim** — `my_person_id` migration, "This is me" UI, "You" badge
2. **PR 2: Relationship explanation** — `generatePathExplanation()`, "How am I related?" button + result panel
3. **PR 3: QR codes + tree highlighting** — QR on cards, `?relate=true` URL handling, path highlight in tree view

## Notes

- The term for subsetting the tree to focus on ancestry is **"ascendant tree"** or **"lineage view"** — showing only the direct line of descent from common ancestors
- The existing `findConnection()` in `src/lib/relationships.ts` already handles BFS pathfinding with kinship labels — this feature is primarily a UI layer on top of that
- The `qrcode` npm package is already in the project dependencies (used for the QR Connect feature concept)
- Consider showing spouse connections in the path explanation in a future phase (e.g., "Your aunt Mary married into the McGinty family")

---
*Created: 2026-02-07*
*Last updated: 2026-02-07*
