# Setup Guide - Family Connections

## Prerequisites

- **Node.js** 18.17 or later
- **npm** or **yarn**
- **Supabase account** (free tier works)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/family-connections.git
cd family-connections
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

#### Option A: Use Existing Project
If you have the Supabase project credentials, create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dmbkijkadgyryldohlli.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
```

#### Option B: Create New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **Settings > API** and copy:
   - Project URL
   - Publishable (anon) key
3. Create `.env.local` with these values
4. Run the database migrations (see below)

### 4. Run Database Migrations

In the Supabase Dashboard SQL Editor, run each migration file in order:

1. `supabase/migrations/20250205_date_to_text.sql`

Or for a fresh database, you'll need the initial schema (contact project owner for the full schema).

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key | Yes |

Copy `.env.local.example` to `.env.local` and fill in your values.

---

## Development Commands

```bash
# Start development server (with Turbopack)
npm run dev

# Type check without building
npx tsc --noEmit

# Lint code
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

---

## Common Issues

### Port 3000 Already in Use

The dev server sometimes leaves zombie processes. Kill them:

```bash
lsof -ti:3000 | xargs kill -9
rm -f .next/dev/lock
npm run dev
```

### Supabase Auth Not Working

1. Check that `.env.local` exists with correct values
2. Verify the Supabase project is running
3. Check browser console for CORS errors
4. Ensure the site URL is configured in Supabase Auth settings

### TypeScript Errors

Run type check to see all errors:

```bash
npx tsc --noEmit
```

---

## Database Schema

See `CLAUDE.md` for the full database schema. Key tables:

- `family_graphs` - User's family tree projects
- `memberships` - User access to graphs
- `persons` - People in family trees
- `relationships` - Connections between people
- `stories` - Stories/memories about people
- `profiles` - User profile information

---

## Project Structure

```
family-connections/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── lib/              # Shared utilities
│   └── types/            # TypeScript type definitions
├── supabase/
│   └── migrations/       # Database migration files
├── public/               # Static assets
├── CLAUDE.md             # AI assistant context
├── NEXT-STEPS.md         # Project roadmap
└── SETUP.md              # This file
```

---

## Deploying to Production

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app is a standard Next.js application and can be deployed anywhere that supports Node.js:

1. Build: `npm run build`
2. Start: `npm start`
3. Set environment variables on your platform

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and test locally
4. Commit with descriptive message
5. Push and create Pull Request

See `NEXT-STEPS.md` for planned features and areas where help is needed.

---

*Last updated: 2025-02-05*
