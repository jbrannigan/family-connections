# Family Connections

Discover how your family is connected. A full-stack family relationship app with QR reunion features, built with Next.js and Supabase.

> Successor to [Family Tree Editor](https://github.com/jbrannigan/family-tree-editor) — shifting from a tree data editor to a collaborative relationship discovery app.

## Features

- **Family Graph** — model all relationship types (biological, adoptive, step, spouse), not just a rigid tree hierarchy
- **Person Detail Pages** — view and edit any person's info, dates, notes, and relationships with links to related persons; union cards for marriages, divorces, and partnerships
- **Search & Navigation** — find anyone instantly with real-time filtering (list view) or jump-to-person with animated pan+zoom (tree view); `Cmd+K` keyboard shortcut
- **Interactive Tree** — SVG-based tree visualization with couple nodes, pan/zoom, click-to-navigate; toggle vertical/horizontal orientation and curved/right-angle connections; union type indicators on couple nodes (Married/Divorced/Partners)
- **QR Connect** — scan codes at family reunions to instantly see how you're related
- **Relationship Calculator** — find the path between any two people and compute kinship (e.g. "2nd cousin once removed")
- **Stories & Fun Facts** — add, edit, and delete stories on any person; fun fact toggle, author attribution, and relative timestamps
- **Authentication** — password-based sign-in via Supabase Auth
- **Collaboration** — invite family members to contribute via invite codes
- **Archival Export** — download your family tree as a human-readable plain-text archive (.txt) or structured JSON (.json); admin-only
- **TreeDown Import** — bulk import family trees from indentation-based text format with gender-based surname inference

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| QR Codes | `qrcode` (client-side generation) |
| Hosting | Vercel (recommended) |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

```bash
git clone https://github.com/jbrannigan/family-connections.git
cd family-connections
npm install
cp .env.local.example .env.local
# Edit .env.local with your Supabase project URL and publishable key
```

### Database

Run the migration in your Supabase SQL editor:

```bash
# Copy the contents of supabase/migrations/00001_initial_schema.sql
# and run it in the Supabase dashboard SQL editor
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jbrannigan/family-connections&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

Set the environment variables in your Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Landing page
│   ├── auth/
│   │   ├── login/          # Magic link login
│   │   └── callback/       # Auth callback handler
│   └── dashboard/          # User dashboard
├── lib/
│   ├── supabase/           # Supabase client (browser, server, middleware)
│   ├── relationships.ts    # Kinship calculator (BFS, cousin-degree)
│   └── import-treedown.ts  # TreeDown format importer
├── types/
│   └── database.ts         # TypeScript types for the data model
└── middleware.ts            # Auth session refresh + route protection

supabase/
└── migrations/
    └── 00001_initial_schema.sql  # Full database schema with RLS policies
```

## License

MIT
