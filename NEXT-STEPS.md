# Next Steps - Family Connections Roadmap

## Completed (Feb 2025)

### Core Features
- [x] User authentication (Supabase Auth with password)
- [x] Family graph creation and membership
- [x] Person and relationship management
- [x] TreeDown import with bulk insert
- [x] Tree visualization (SimpleTreeView with couple nodes)
- [x] List view with person cards

### Recent Fixes (Session 2025-02-05)
- [x] **Gender inference for surname inheritance** - Children now correctly inherit surnames based on parent genders (e.g., Peggy McGinty & James Brannigan → children are Brannigans)
- [x] **ISO 8601 reduced precision dates** - Dates now store only what's known (year-only "1958" instead of "1958-01-01")
- [x] **Database migration** - Changed date columns from `date` to `text` type

---

## Priority 1: Essential Improvements

### Person Detail/Edit Page ✅ (v0.2.0)
- [x] Dedicated page for viewing/editing person details
- [x] Edit display name, pronouns, dates, notes
- [x] View all relationships for a person
- [x] Union cards for marriages, divorces, partnerships (v0.6.0)
- [ ] Add/remove relationships from person page

### Search & Navigation ✅ (v0.3.0)
- [x] Search box in tree/list views
- [x] Jump to person in tree (animated pan+zoom)
- [x] Cmd+K keyboard shortcut to focus search
- [ ] Keyboard navigation (arrow keys in tree)
- [ ] Breadcrumb showing path from root

### Data Validation
- [ ] Validate date formats on input
- [ ] Warn about circular relationships
- [ ] Detect and merge duplicate persons
- [ ] Undo/redo for edits

---

## Priority 2: User Experience

### Graph Settings ✅ (v0.11.0)
- [x] Rename graph
- [x] Change owner (transfer ownership)
- [x] Manage members (invite, remove, change roles)
- [x] Delete graph (with typed confirmation)

### Profile Management
- [ ] Edit user display name
- [ ] Upload avatar
- [ ] View graphs user belongs to

### Mobile Responsiveness ✅ (v0.11.1)
- [x] Responsive headers, padding, and touch targets across all pages
- [x] Icon-only tree settings buttons on mobile
- [x] Responsive form widths and tree container height
- [ ] Touch gestures for tree navigation (pinch-to-zoom, swipe)
- [ ] Mobile-specific navigation (hamburger menu, bottom nav)
- [ ] PWA/offline support

---

## Priority 3: Advanced Features

### Stories Feature ✅ (v0.4.0)
- [x] Add stories to persons
- [x] Fun facts toggle
- [x] Story display in person detail
- [x] Story count on person list cards
- [ ] Story timeline view

### Export & Sharing
- [x] Plain-text archive export (.txt) (v0.7.0)
- [x] JSON structured export (.json) (v0.7.0)
- [ ] Export tree as PNG/SVG image
- [ ] Export to GEDCOM format
- [ ] Share read-only link
- [ ] Print-friendly view

### QR Code Check-in (Reunion Feature)
- [ ] Generate QR code for graph
- [ ] Check-in page for scanning
- [ ] Track who's attended
- [ ] Display check-in status on person cards

---

## Priority 4: Future Enhancements

### Advanced Tree Visualization ✅ (v0.5.0)
- [x] Horizontal layout option
- [x] Vertical layout option (top-down, new default)
- [x] Connection style toggle (curved / right-angle)
- [x] Rich detailed nodes (name parts, dates, location, avatar silhouettes)
- [x] Compact/detailed node style toggle
- [x] Structured person name fields (given_name, nickname, preferred_name)
- [x] Ancestor view — select a person and view their direct ancestral line as an ascending pedigree chart
- [x] Descendant view — select a person and show only their descendants
- [ ] Collapse/expand subtrees
- [ ] Highlight search results
- [ ] Different color themes

### Collaboration
- [ ] Real-time updates (Supabase Realtime)
- [ ] Edit history/audit log
- [ ] Comments on persons
- [ ] Change approval workflow

### Import/Export
- [ ] Import from GEDCOM
- [ ] Import from Ancestry/FamilySearch
- [ ] Bulk edit via CSV

---

## Technical Debt

### Performance
- [ ] Virtualize large person lists
- [ ] Lazy load tree branches
- [ ] Optimize relationship queries

### Testing
- [x] Unit tests for TreeDown parser (12 tests)
- [x] Unit tests for dtree-transform (20 tests)
- [x] Unit tests for date-utils, search, union-utils, archive-export (79 tests)
- [ ] E2E tests for critical flows (Playwright)
- [ ] Visual regression tests for tree

### Documentation
- [x] CLAUDE.md - AI assistant context
- [x] SETUP.md - Installation guide
- [x] NEXT-STEPS.md - Roadmap (this file)
- [x] User guide — in-app at /guide
- [ ] API documentation

---

## Notes for Contributors

### Code Style
- TypeScript strict mode
- Functional components with hooks
- Server components where possible (Next.js App Router)
- Tailwind CSS for styling

### Database Changes
1. Create migration in `supabase/migrations/`
2. Run migration in Supabase SQL Editor
3. Update TypeScript types in `src/types/database.ts`
4. Update CLAUDE.md schema section

### Adding New Features
1. Check this roadmap for related items
2. Create feature branch
3. Implement with tests if possible
4. Update documentation
5. Submit PR with description

---

*Last updated: 2026-02-07*
