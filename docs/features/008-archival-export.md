# Feature 008: Archival & Export

**Status:** Draft
**Branch:** `feat/008-archival-export`
**PRs:** (link PRs here as they're created)

## Summary

Provide robust archival and export capabilities so family data is never locked into the app. Includes automated database backups with off-site storage, and a human-readable ASCII/plain-text export format that describes the family as natural-language facts rather than a data model dump.

## Motivation

Family data is irreplaceable. If the database is lost, decades of research and memories disappear. Users need confidence that:

1. **Data is backed up** — automated, off-site, recoverable
2. **Data is portable** — can be exported in a format that makes sense to humans, not just machines
3. **Data is future-proof** — even if this app disappears, the export file tells the full story in plain English

The plain-text export is deliberately NOT JSON, CSV, or GEDCOM — it's a narrative file that anyone can read, print, and understand without software. It reads like a family archive document.

## Scope

### In Scope

#### Backup & Recovery
- Automated Supabase database backups (already included in Supabase Pro plan)
- Manual backup trigger from the app (admin only)
- Off-site backup to a secondary location (e.g., S3 bucket, Google Drive, or downloadable archive)
- Backup verification / integrity check

#### Plain-Text Archive Export
- Export the entire family graph as a human-readable `.txt` file
- Format: natural-language facts organized by person
- Example output:
  ```
  === JOHN McGINTY ===
  Born: 1870, County Donegal, Ireland
  Died: 1909

  Married to Margaret Kirk.

  Children:
    - James Lynch McGinty
    - Margaret Agnes McGinty
    - Mary Elizabeth McGinty
    - Thomas Kirk McGinty

  Stories:
    John was known for his incredible singing voice.
    He could often be heard singing Irish ballads on the docks.
    (Fun Fact — added by Jim Brannigan)

  Heirlooms:
    - McGinty Family Origin Story [see: mcginty-founder-story.pdf]
    - Passport [see: john-mcginty-passport.jpg]
  ```
- File references for attached documents/photos (names only, not embedded binary)
- Chronological or alphabetical ordering options
- Header with graph metadata (name, export date, member count)

#### JSON Export (machine-readable companion)
- Full structured export as `.json` for programmatic use
- Includes all persons, relationships, stories, heirlooms with IDs
- Can be re-imported in the future

### Out of Scope
- GEDCOM export (separate feature, different audience)
- Automatic cloud sync (Google Drive, Dropbox integration)
- Version-controlled history of edits (audit log is a separate feature)
- Encrypted backups (rely on storage provider encryption)
- Import from the plain-text format (it's an archive, not a round-trip format)

## Design

### User Experience

#### Export UI (Admin Only)
- On the graph settings or dashboard page, an **"Export"** dropdown with:
  - **"Download Archive (.txt)"** — human-readable plain-text export
  - **"Download Data (.json)"** — machine-readable structured export
  - **"Download All (.zip)"** — both files plus any attached heirloom files
- Progress indicator for large graphs
- Download triggers browser file download

#### Plain-Text Format Design

The file is organized as a narrative document:

```
╔══════════════════════════════════════════════════╗
║  THE BRANNIGAN FAMILY                            ║
║  Family Connections Archive                      ║
║  Exported: February 7, 2026                      ║
║  241 people · 403 relationships · 5 stories      ║
╚══════════════════════════════════════════════════╝

This file is a plain-text archive of the Brannigan family
tree. It contains all known facts, stories, and references
to heirloom documents. No special software is needed to
read this file.

────────────────────────────────────────────────────

JOHN McGINTY
  Born: 1870, County Donegal, Ireland
  Died: 1909

  Married to Margaret Kirk.

  Children:
    · James Lynch McGinty (b. 1895)
    · Margaret Agnes McGinty (b. 1897)
    · Mary Elizabeth McGinty (b. 1899)
    · Thomas Kirk McGinty (b. 1901)

  Stories:
    "John was known for his incredible singing voice.
     He could often be heard singing Irish ballads
     on the docks."
     — Fun Fact, added by Jim Brannigan

  Related Documents:
    → mcginty-founder-story.pdf
    → john-mcginty-passport.jpg

────────────────────────────────────────────────────

MARGARET KIRK
  Born: 1872
  ...
```

Key design decisions:
- **No IDs, no UUIDs, no JSON** — pure human-readable text
- **Unicode box-drawing** for visual structure (prints well)
- **Arrow references** (`→ filename.pdf`) point to companion files in the zip
- **Stories are quoted** with attribution
- **Chronological facts** — born, married, children, died
- **Persons sorted alphabetically** by display name

### Technical Approach

#### Archive Generator
A server-side utility that:
1. Fetches all persons, relationships, stories, and (future) heirlooms for a graph
2. Groups relationships by person
3. Renders each person as a text block using the format above
4. Assembles into a single `.txt` file with header/footer

```typescript
// src/lib/archive-export.ts
export function generateArchiveText(
  graph: FamilyGraph,
  persons: Person[],
  relationships: Relationship[],
  stories: StoryWithAuthor[],
): string
```

#### JSON Export
Straightforward structured dump:
```typescript
export function generateArchiveJSON(
  graph: FamilyGraph,
  persons: Person[],
  relationships: Relationship[],
  stories: Story[],
): object
```

#### API Route for Download
- `POST /api/graph/[id]/export?format=txt|json|zip`
- Streams the response as a file download
- Admin-only (check membership role)

#### Supabase Backup
- Supabase Pro/Team plans include automated daily backups with point-in-time recovery
- Add a manual "Download Backup" button that triggers a `pg_dump` via Supabase Management API or a custom edge function
- Store off-site copy in configurable storage (start with direct download)

### Database Changes

None for the export feature itself. The backup feature may need a `backup_log` table to track backup history, but that can be added when implemented.

## Acceptance Criteria

- [ ] Admin can download a `.txt` archive of the entire family graph
- [ ] Plain-text archive is human-readable without any software
- [ ] Archive includes: person facts, relationships, stories, heirloom references
- [ ] Archive header shows graph name, export date, and counts
- [ ] Admin can download a `.json` export with full structured data
- [ ] Admin can download a `.zip` containing both files (and heirloom files when that feature exists)
- [ ] Export works for the 241-person Brannigan dataset without timeout
- [ ] Backup strategy is documented and automated backups are configured

## Test Plan

### Unit Tests
- `generateArchiveText()` — correct formatting for various person configurations
- Handles persons with no relationships, no stories
- Handles multiple marriages, divorces
- Date formatting in archive (year-only, full date, no date)
- Alphabetical sorting of persons

### Integration Tests
- Export API route returns correct content type and filename
- Admin-only access enforcement

### E2E Tests
- Full export flow: click export → file downloads → content is correct

### Regression
- Ensure export doesn't modify any data (read-only operation)

## PR Breakdown

1. **PR 1: Plain-text archive export** — `generateArchiveText()`, download API route, UI button
2. **PR 2: JSON export + ZIP bundle** — structured export, zip packaging with heirloom files
3. **PR 3: Backup configuration** — Supabase backup documentation, manual backup trigger, off-site strategy

## Notes

- The plain-text format is inspired by historical genealogy documents — it should feel like a family record, not a database dump
- Consider adding a "last exported" timestamp on the graph so users know how recent their backup is
- The `.txt` format deliberately avoids any markup (HTML, Markdown) so it's universally readable and printable
- Future: could generate a beautiful PDF version of the archive with formatting, but plain text comes first for portability
- The archive format should be extensible — when heirlooms are added, the generator just needs to include their references

---
*Created: 2026-02-07*
*Last updated: 2026-02-07*
