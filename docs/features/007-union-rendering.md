# Feature 007: Union Rendering

**Status:** Draft
**Branch:** `feat/007-union-rendering`
**PRs:** (link PRs here as they're created)

## Summary

Improve how couples/unions are displayed throughout the app so that both partners are shown together with a visual indicator of their union type (married, partner, ex-spouse, etc.), rather than just listing one person with the other as a relationship line item.

## Motivation

Currently, the tree view renders couple nodes as "Person A & Person B" but doesn't communicate the nature of the union. The list view and person detail page show unions as flat relationship entries ("Spouse of X"). Users want to see unions as first-class visual elements — a box showing both people with a label like "Married", "Partners", "Divorced", etc. This is especially important for families with complex relationship histories (remarriages, divorces, partnerships).

## Scope

### In Scope
- **Union display box** — visual container showing both partners with their union type label
- **Union type labels** — human-readable labels derived from relationship types:
  - `spouse` → "Married" (with optional date range)
  - `ex_spouse` → "Divorced" (with optional date range)
  - `partner` → "Partners" (with optional date range)
- **Date display on unions** — show start/end dates where available (e.g., "Married 1958–1990", "Divorced 1990")
- **Tree view enhancement** — couple nodes already exist; add union type indicator
- **Person detail page** — show unions as styled cards instead of flat text
- **List view** — show union info on person cards more prominently

### Out of Scope
- Union-specific detail pages (separate feature)
- Engagement, "separated", or custom union types (can add later by extending `RelationshipType`)
- Wedding photos or union-specific stories (covered by heirlooms feature)
- Polyamorous/multi-partner union visualization (would need design discussion)

## Design

### User Experience

#### Tree View Couple Nodes
- Current: "John McGinty (1870–1909) & Margaret Kirk (…)"
- Proposed: Same layout but with a small union type indicator:
  - A thin colored bar or icon between the names
  - Hover/click reveals: "Married" or "Partners" or "Divorced"
  - For ex-spouses who remarried: person may appear in multiple couple nodes with different indicators

#### Person Detail Page — Union Cards
- Instead of listing "Spouse of Margaret Kirk" as a text line, show a **union card**:
  ```
  ┌─────────────────────────────────────┐
  │  💍 Married                         │
  │  Margaret Kirk                  →   │
  │  1865 – 1909                        │
  └─────────────────────────────────────┘
  ```
- Card shows: union type icon/emoji, partner name (clickable link), date range if available
- Multiple unions shown as separate cards in chronological order

#### List View Person Cards
- Below relationships, show union info more prominently
- e.g., "Married to Margaret Kirk" instead of "Spouse of Margaret Kirk"

### Technical Approach

#### Union Resolution Utility
Create a utility that groups relationship data into "unions":

```typescript
interface Union {
  type: 'married' | 'divorced' | 'partners';
  partner: Person;
  startDate: string | null;
  endDate: string | null;
  relationshipId: string;
}

function resolveUnions(
  personId: string,
  relationships: Relationship[],
  persons: Person[],
): Union[]
```

This maps from raw relationship types:
- `spouse` → `married`
- `ex_spouse` → `divorced`
- `partner` → `partners`

#### Tree View Changes
- Modify `simple-tree-view.tsx` couple node rendering to include union type
- Add a small icon or label element within the SVG couple node

#### Person Detail Changes
- Add a `UnionCard` component to replace flat spouse/partner text
- Render in the relationships section, separated from parent/child relationships

### Database Changes

None. The existing `relationships` table already stores `type`, `start_date`, and `end_date` which cover all union information needed.

## Acceptance Criteria

- [ ] Person detail page shows unions as styled cards with type label (Married/Divorced/Partners)
- [ ] Union cards show partner name as clickable link
- [ ] Union cards show date range when start_date/end_date are available
- [ ] Multiple unions for the same person are shown in chronological order
- [ ] Tree view couple nodes include a subtle union type indicator
- [ ] List view uses human-readable union labels ("Married to X" not "Spouse of X")
- [ ] All three existing union types render correctly: spouse, ex_spouse, partner
- [ ] Works with the existing dataset (which includes multiple marriages and divorces)

## Test Plan

### Unit Tests
- `resolveUnions()` — correct grouping and type mapping
- Date range formatting for unions
- Chronological ordering of multiple unions

### Integration Tests
- `UnionCard` component renders correctly for each union type
- Tree view couple nodes render union indicators

### E2E Tests
- Navigate to person with multiple marriages → see union cards in correct order
- Click partner name on union card → navigates to partner's page

### Regression
- Existing tree view couple node rendering still works
- Existing relationship display on person cards still correct

## Notes

- The existing couple node in `simple-tree-view.tsx` already pairs spouses — this feature enhances what's shown, not the pairing logic
- Consider using subtle emoji or icons for union types: 💍 Married, 💔 Divorced, 🤝 Partners
- The McGinty family dataset has several examples of remarriage and divorce that make good test cases

---
*Created: 2026-02-07*
*Last updated: 2026-02-07*
