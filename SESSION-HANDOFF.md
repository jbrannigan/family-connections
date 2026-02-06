# Session Handoff — February 6, 2026

> This file captures the current project state for continuity between sessions.
> Claude Code: read this alongside CLAUDE.md for full context.

## What Just Happened

### Engineering Workflow Setup (PR #1)
We set up a proper engineering workflow for this project. **PR #1 is open and needs CI to pass before merging.**

**Branch:** `chore/000-engineering-workflow` (currently checked out)
**PR:** https://github.com/jbrannigan/family-connections/pull/1

**What was added:**
- CLAUDE.md updated with full engineering workflow (feature docs → branch → test → PR → review → merge → version)
- Vitest + React Testing Library installed for unit/integration tests
- Playwright installed for E2E browser tests
- 11 seed tests for TreeDown parser in `src/lib/import-treedown.test.ts` (10 pass, 1 known bug flagged as `.todo`)
- Smoke E2E spec in `e2e/smoke.spec.ts`
- CI pipeline updated: lint + typecheck + **unit tests** + build (tests gate the build)
- Feature doc template at `docs/features/_TEMPLATE.md`
- CHANGELOG.md starting at v0.1.0
- Test scripts: `npm test`, `test:watch`, `test:e2e`, `test:all`, `typecheck`

**CI Issue Found & Fixed:**
- `npx next lint` failed on GitHub Actions — Next.js 16 needs `--dir .` flag
- Fixed in commit `1f5d375` — already pushed, should be re-running CI now

**Action needed:** Check CI status on PR #1. If green, merge it (squash merge to main).

## Known Bug Discovered
The TreeDown parser's `stripMetadata()` function strips the closing paren from nicknames like `(Peggy)`. The `isNickname()` function correctly identifies nicknames, but the paren balancing in `stripMetadata()` removes the `)` anyway. Flagged as `it.todo("preserves nicknames in parentheses")` in the test file. This should be a `fix/001-nickname-paren-bug` PR.

## Project Architecture Summary

**Three related project folders (all in ~/Projects/):**
1. **family-connections/** — Active project. Next.js 16 + Supabase. This is where all new work happens.
2. **family-tree-editor/** — First-gen app (React, client-only). Still live on GitHub Pages. Has mockups for the redesign in `mockups/`.
3. **McGinty Clan/** — Organized archive of original data files, app snapshots, and exports. Cleaned up (2GB → 2MB).

**Family Connections tech stack:**
- Next.js 16.1.6 (App Router, Turbopack), React 19, TypeScript 5 strict
- Supabase PostgreSQL with RLS, password-based auth
- Tailwind CSS 4, dark green theme
- Custom SimpleTreeView (SVG + D3), TreeDown parser
- 241 people, 403 relationships in "Brannigan Family" graph
- GitHub: https://github.com/jbrannigan/family-connections

## MacBook Version — Unique Code Archived (Feb 6, 2026)

A fourth folder `family-tree-editor-macbook` was discovered containing an older MacBook development version of the v1 React app. Analysis found significant unique code NOT present in the PC copy (`family-tree-editor/`) or the archive. These files have been preserved to `McGinty Clan/06-App-Snapshots/macbook-unique-code/`.

**Unique files archived:**

| File | What it does | Potential v2 value |
|------|-------------|-------------------|
| `JSONEditor.js` + `.css` | GUI panel for editing person attributes as structured JSON (name, birth, death, facts, relationships). Tabbed interface with validation. | Could inform the person detail/edit page design |
| `types/TreeDownTypes.js` | JSDoc typedefs for TreeDown entities: Person, Union, PersonFact, EntityType enum | Reference when formalizing TypeScript types for TreeDown spec |
| `types/TreeNode.js` | TreeNode class with parent/child/spouse linking, depth tracking, metadata | Useful patterns for tree data structures |
| `utils/parseInlineFacts.js` | Parses inline facts from TreeDown text — occupation, location, cause of death, notes in `[brackets]` | **High value** — inline facts parsing is not in the v2 parser yet |
| `utils/parseTreeDownEntities.js` | Alternative entity parser that returns typed Person/Union objects with full metadata | Reference for enhancing `import-treedown.ts` |
| `utils/treeDownTemplate.js` | Generates boilerplate TreeDown text from a person record | Useful for export/template features |
| `utils/updateTreeTextJSON.js` | Syncs edits from JSON editor back into TreeDown text format | Reference for bidirectional TreeDown ↔ structured data |
| `utils/cleanUpTreeText.js` | Automated cleanup: normalizes whitespace, fixes indentation, removes orphan lines | Could become a CLI/import preprocessing step |
| `App.js` | Enhanced 739-line version (vs 614 in PC copy) with JSONEditor integration, additional toolbar actions | Shows the most mature UI state of v1 |
| `test-json-format.txt` | Sample JSON structure for testing the JSON editor | Test data reference |

**Key takeaway for development:** The `parseInlineFacts.js` parser is the most immediately useful piece — the v2 TreeDown parser (`import-treedown.ts`) doesn't handle inline facts like `[occupation: carpenter]` yet, and this code already solves that problem.

## Remaining TODO Items

### Data Integrity
- [ ] Verify `mcginty-tree-CURRENT.txt` (in McGinty Clan archive) matches Supabase DB data
- [ ] Check for duplicate people in database (old dedup bug may have left artifacts)
- [ ] Review tree issues CSVs in `McGinty Clan/09-QC-and-Issues/`

### Development Roadmap (from NEXT-STEPS.md)
**Priority 1 — Essential:**
- [ ] Person detail/edit page
- [ ] Search & navigation (jump to person in tree)
- [ ] Data validation (date formats, circular relationships, duplicate detection)

**Priority 2 — UX:**
- [ ] Graph settings (rename, manage members, delete)
- [ ] Mobile responsiveness
- [ ] Profile management

**Priority 3 — Advanced:**
- [ ] Stories UI (DB table exists, no frontend)
- [ ] Export to PNG/SVG/GEDCOM
- [ ] QR code reunion check-in (kinship calculator works, needs UI + QR)

### Technical Debt
- [ ] Fix nickname paren bug (fix/001)
- [ ] Add more test coverage (parser edge cases, relationship calculator)
- [ ] Remove unused tree visualization libraries from package.json (d3-dtree, family-chart, relatives-tree, topola — only SimpleTreeView is used)

### Family Engagement
- [ ] Reach out to Larry McGinty, Betty McGinty, Kevin Fitzgerald for data validation (Gmail threads exist)
- [ ] Plan demo for family members
- [ ] Collect stories/photos once Stories UI exists

## Workflow Rules (for Claude Code)

All work must follow the workflow in CLAUDE.md:
1. **Feature doc first** — create `docs/features/NNN-name.md` from the template
2. **Feature branch** — `feat/NNN-name`, `fix/NNN-name`, or `chore/NNN-name`
3. **Implement with tests** — unit tests (Vitest) for logic, E2E (Playwright) for flows
4. **PR with CI** — push branch, create PR via `gh pr create`, CI must pass
5. **Prompt user to review** — never merge without Jim's approval
6. **Update CHANGELOG.md** after merge
7. **Version bump** — MINOR for features, PATCH for fixes

## Git State
- **Current branch:** `chore/000-engineering-workflow`
- **Pending PR:** #1 (waiting for CI)
- **Main branch:** up to date with all previous work
- **Remote:** https://github.com/jbrannigan/family-connections.git

## Environment
- **Supabase project:** `dmbkijkadgyryldohlli`
- **Test user:** `jim@brnngn.com` (admin of "Brannigan Family" graph)
- **Graph ID:** `6c7ef05c-71e7-4a05-bb36-bd31f1040528`
