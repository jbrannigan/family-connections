# Feature 009: Heirlooms & Documents

**Status:** Draft
**Branch:** `feat/009-heirlooms-documents`
**PRs:** (link PRs here as they're created)

## Summary

Add the concept of **heirlooms** — family documents, photos, and artifacts that can be uploaded, attached to persons, and used as sources for stories and facts. An heirloom might be a scanned passport, a founding family document, a photo album, or a letter. Each heirloom can generate stories that are linked back to it as a source, and facts can be extracted (manually or via OCR) to enrich person records.

## Motivation

Family history isn't just names and dates — it lives in the documents, photos, and artifacts that families preserve. The McGinty family, for example, has:

- **"McGinty Family 1847-1993"** — a PDF founding document that tells the family origin story
- **Passports, certificates, and letters** — primary source documents with extractable facts
- **Family photos** — visual records tied to specific people and events

Currently, these live as loose files on someone's computer (`/McGinty Clan/01-Original-Family-Document/`). This feature brings them into the app where they become structured, searchable, and linked to the people they reference.

The key insight: an heirloom isn't just an attachment — it's a **source** that generates stories and facts. The founding PDF contains stories about John McGinty's emigration, Margaret Kirk's childhood, and dozens of other family members. Those stories should live on the relevant person pages, but always point back to the heirloom as their origin.

## Scope

### In Scope

#### Heirloom Management
- **Upload heirlooms** — PDF, images (jpg/png), documents (the file itself is stored)
- **Heirloom metadata** — title, description, type (document/photo/artifact/certificate), date, provenance
- **Heirloom detail page** — view the document/image, see metadata, see linked persons and stories
- **Heirloom gallery** — browse all heirlooms for a graph

#### Person ↔ Heirloom Linking
- **Link heirlooms to persons** — an heirloom can reference multiple persons (e.g., a family photo shows 5 people)
- **Person detail page** shows linked heirlooms with thumbnails
- **Heirloom detail page** shows linked persons with links to their pages

#### Heirloom-Sourced Stories
- **Create stories from heirlooms** — when adding a story to a person, optionally mark it as sourced from an heirloom
- **Story source attribution** — stories show "Source: McGinty Family 1847-1993" with a link to the heirloom
- **Heirloom detail page** shows all stories that reference it

#### Fact Extraction (Manual + Assisted)
- **Manual fact entry** — user reads a document and creates facts/stories from it
- **OCR-assisted extraction** (stretch goal) — for scanned documents like passports, extract text and suggest facts:
  - Name, birth date, nationality from a passport
  - Dates and names from certificates
  - User reviews and approves extracted facts before they're saved

### Out of Scope
- Video or audio heirloom support (phase 1 = documents and images only)
- Automatic AI summarization of documents (manual extraction first)
- Version control for heirloom files (replace is fine for now)
- Collaborative annotation (commenting on specific regions of a document)
- Physical heirloom tracking (location, condition, custodian)

## Design

### User Experience

#### 1. Uploading an Heirloom

- On the graph page or a new "Heirlooms" tab, admin users see **"+ Add Heirloom"**
- Upload form:
  - **File** — drag-and-drop or file picker (PDF, JPG, PNG; max 10MB)
  - **Title** — e.g., "McGinty Family 1847-1993"
  - **Type** — dropdown: Document, Photo, Certificate, Letter, Artifact, Other
  - **Description** — optional free text about provenance, condition, etc.
  - **Date** — approximate date of the heirloom (ISO reduced precision)
  - **Link to persons** — multi-select picker to associate with relevant persons

#### 2. Heirloom Detail Page

```
┌─────────────────────────────────────────────┐
│  📄 McGinty Family 1847-1993                │
│  Document · circa 1993                       │
│                                              │
│  ┌─────────────────────────────────┐        │
│  │                                 │        │
│  │   [PDF Viewer / Image Preview]  │        │
│  │                                 │        │
│  └─────────────────────────────────┘        │
│                                              │
│  Description:                                │
│  The founding document of the McGinty        │
│  family, covering 1847-1993. Written by      │
│  Larry McGinty.                              │
│                                              │
│  LINKED PERSONS (12)                         │
│  · John McGinty · Margaret Kirk              │
│  · James Lynch McGinty · Thomas Kirk McGinty │
│  · ...                                       │
│                                              │
│  STORIES FROM THIS HEIRLOOM (5)              │
│  · "John emigrated from County Donegal..."   │
│    — on John McGinty's page                  │
│  · "Margaret Kirk was born in..."            │
│    — on Margaret Kirk's page                 │
│  · ...                                       │
│                                              │
│  [+ Create Story from this Heirloom]         │
└─────────────────────────────────────────────┘
```

#### 3. Heirlooms on Person Detail Pages

In the person detail page, below Stories, a new **"Heirlooms"** section:

```
HEIRLOOMS (2)
┌──────────────────────────────────┐
│ 📄 McGinty Family 1847-1993  →  │
│ Document · Mentioned in 3 stories│
├──────────────────────────────────┤
│ 📷 John McGinty Passport     →  │
│ Certificate · 1 fact extracted   │
└──────────────────────────────────┘
```

#### 4. Creating Stories from Heirlooms

When viewing an heirloom detail page:
- Click **"+ Create Story from this Heirloom"**
- Select which person the story is about (from linked persons or search)
- Write the story content (or paste extracted text)
- The story is automatically tagged with `heirloom_id` as its source
- Story appears on the person's page with source attribution

#### 5. OCR / Fact Extraction (Stretch)

For image-based heirlooms (scanned passports, certificates):
- **"Extract Text"** button runs OCR on the image
- Results shown in a review panel with suggested facts:
  ```
  Extracted from passport:
  ☑ Name: John McGinty
  ☑ Born: 1870
  ☑ Nationality: Irish
  ☐ Passport No: [redacted - skip]

  [Save Selected Facts as Stories]
  ```
- User checks/unchecks which facts to save
- Selected facts become stories on the relevant person, sourced from the heirloom

### Technical Approach

#### Database Schema

```sql
-- Heirlooms table
CREATE TABLE heirlooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id uuid NOT NULL REFERENCES family_graphs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'document',  -- document, photo, certificate, letter, artifact, other
  date text,  -- ISO reduced precision
  file_path text NOT NULL,  -- Supabase Storage path
  file_name text NOT NULL,  -- Original filename
  file_size integer,
  mime_type text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Many-to-many: heirlooms ↔ persons
CREATE TABLE heirloom_persons (
  heirloom_id uuid NOT NULL REFERENCES heirlooms(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  PRIMARY KEY (heirloom_id, person_id)
);

-- Add optional heirloom source to stories
ALTER TABLE stories ADD COLUMN heirloom_id uuid REFERENCES heirlooms(id) ON DELETE SET NULL;
```

#### File Storage
- Use **Supabase Storage** with a bucket per graph: `heirlooms/{graph_id}/{heirloom_id}/{filename}`
- Signed URLs for secure access (respects RLS — only graph members can view)
- Thumbnail generation for images (could use Supabase Image Transformations or client-side)

#### RLS Policies
```sql
-- Members can view heirlooms in their graphs
CREATE POLICY "Members can view heirlooms" ON heirlooms FOR SELECT
  USING (EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND graph_id = heirlooms.graph_id));

-- Members can insert heirlooms
CREATE POLICY "Members can insert heirlooms" ON heirlooms FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND graph_id = heirlooms.graph_id));

-- Only uploader or admin can update/delete
CREATE POLICY "Uploader can update heirlooms" ON heirlooms FOR UPDATE
  USING (uploaded_by = auth.uid());

CREATE POLICY "Uploader can delete heirlooms" ON heirlooms FOR DELETE
  USING (uploaded_by = auth.uid());
```

#### Key Components

| Component | Purpose |
|-----------|---------|
| `src/app/graph/[id]/heirlooms/page.tsx` | Heirloom gallery page |
| `src/app/graph/[id]/heirlooms/[heirloomId]/page.tsx` | Heirloom detail page |
| `src/app/graph/[id]/heirlooms/upload-form.tsx` | Upload form with file picker |
| `src/app/graph/[id]/person/[personId]/heirloom-section.tsx` | Heirlooms section on person detail |
| `src/lib/heirloom-utils.ts` | Heirloom type labels, file validation, etc. |

### Database Changes

New migration with:
- `heirlooms` table
- `heirloom_persons` junction table
- `heirloom_id` column on `stories` table
- Supabase Storage bucket creation
- RLS policies for all new tables

## Acceptance Criteria

- [ ] Admin can upload an heirloom (PDF/image) with title, type, description, and date
- [ ] Heirloom files are stored securely in Supabase Storage
- [ ] Heirloom detail page shows the document/image with metadata
- [ ] Heirlooms can be linked to multiple persons
- [ ] Person detail page shows linked heirlooms in a dedicated section
- [ ] Stories can be sourced from an heirloom (shows "Source: [heirloom title]" with link)
- [ ] Heirloom detail page lists all stories sourced from it
- [ ] Heirloom gallery page shows all heirlooms for the graph
- [ ] Only graph members can view heirlooms (RLS enforced)
- [ ] The "McGinty Family 1847-1993" PDF can be uploaded and linked to relevant persons

## Test Plan

### Unit Tests
- Heirloom type label formatting
- File validation (size, mime type)
- Source attribution rendering

### Integration Tests
- Upload flow with Supabase Storage
- Linking heirlooms to persons
- Creating heirloom-sourced stories

### E2E Tests
- Full flow: upload PDF → link to person → create story from it → verify on person page
- Heirloom gallery browsing

### Regression
- Stories without heirloom source still render correctly
- Person detail page handles persons with no heirlooms

## PR Breakdown

1. **PR 1: Database + heirloom CRUD** — Migration, upload form, heirloom detail page, gallery
2. **PR 2: Person linking** — Junction table, link UI on heirloom page and person page
3. **PR 3: Story sourcing** — `heirloom_id` on stories, source attribution display, "Create story from heirloom" flow
4. **PR 4: OCR extraction** (stretch) — Text extraction from images, fact review panel

## Notes

- The McGinty family has a real founding document at `McGinty Clan/01-Original-Family-Document/McGinty Family 1847-1993.pdf` — this is the prototype heirloom for testing
- There's also an original Visio tree diagram at `08-Reference-and-Notes/mcginty-tree-original-visio-larry.vsdx` that could be another heirloom
- The archival export (feature 008) should include heirloom file references (`→ filename.pdf`) and package heirloom files in the ZIP export
- Consider a "Provenance" field for heirlooms — who created it, who donated it, where it was found
- OCR could use Supabase Edge Functions with a vision API, or a client-side library like Tesseract.js
- File size limits: start with 10MB per file, can increase later with Supabase Pro storage

---
*Created: 2026-02-07*
*Last updated: 2026-02-07*
