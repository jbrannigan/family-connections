# Server Unification — Family Connections

## Current State Assessment

| Aspect | Current |
|--------|---------|
| **Stack** | Next.js 16 + React 19 + TypeScript |
| **Backend** | Next.js Server Components + Server Actions (no separate API) |
| **Database** | PostgreSQL via Supabase (hosted at dmbkijkadgyryldohlli.supabase.co) |
| **Auth** | Supabase Auth (password-based email/password) |
| **Dev Port** | 3002 (Next.js) |
| **External Services** | Supabase (database + auth + storage for avatars) |
| **Deployment** | Not yet deployed (Vercel recommended in docs) |
| **Dev Command** | `npm run dev` |

## Containerization Plan

### Docker Compose Services

```yaml
# family-connections/docker-compose.yml
services:
  family-connections-app:
    build: .
    ports:
      - "3002:3002"   # Dev already runs on 3002
    env_file: .env.local
    # Next.js handles everything (server components + server actions)
```

### Dockerfile

Same pattern as Coach — Node.js 20 multi-stage build:
1. **deps stage** — install node_modules
2. **build stage** — `next build`
3. **run stage** — `next start` (slim image)

### What Changes

- **Port mapping**: Dev server now runs on **3002** natively; Docker maps 3002:3002
- **Supabase**: Continue using hosted Supabase (no local Supabase containers needed for this app)
- **Environment variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Supabase Storage**: Avatars bucket accessed via Supabase client — no change needed

### Cloud Deployment Readiness

- No current deployment — containerization is the path to first deployment
- Vercel remains easiest option for Next.js, but Docker enables any host
- Only external dependency is hosted Supabase

## Authentication Considerations

- **Current**: Supabase Auth with password-based login + `@supabase/ssr` cookies
- **Same pattern as Coach** — both use Supabase Auth with cookies
- **Unified auth**: If Coach and Family Connections share a Supabase project, users log in once. Currently they use separate Supabase projects (different URLs), so they have separate user pools.
- **Guest Mode**: Has a client-side guest mode for family reunion device sharing (PIN lock) — this is UI-only, not server auth
- **Role system**: Owner, Editor, Contributor, Viewer — managed via `memberships` table with RLS

## Port Allocation (Proposed)

| Service | Internal Port | External Port |
|---------|--------------|---------------|
| Family Connections App | 3002 | **3002** |

## Migration Effort: Low

- Nearly identical to Coach containerization (both Next.js + Supabase)
- No local database services to orchestrate
- Could share a common Dockerfile template with Coach
- Main work: write Dockerfile + docker-compose, test
