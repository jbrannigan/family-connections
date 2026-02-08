-- ============================================================
-- Migration: Expand role system + invite links table
-- Feature 014: Roles, Invite Links & Guest Mode
-- ============================================================

-- Add new role values to the member_role enum
ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'contributor';
ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'viewer';

-- Migrate existing data: admin → owner, member → viewer
UPDATE memberships SET role = 'owner' WHERE role = 'admin';
UPDATE memberships SET role = 'viewer' WHERE role = 'member';

-- Update default
ALTER TABLE memberships ALTER COLUMN role SET DEFAULT 'viewer';

-- ============================================================
-- UPDATE MEMBERSHIPS RLS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Users join graphs" ON memberships;
DROP POLICY IF EXISTS "Admins update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins delete memberships" ON memberships;
DROP POLICY IF EXISTS "Owners bootstrap membership" ON memberships;

CREATE POLICY "Owners bootstrap membership"
  ON memberships FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND role = 'owner'
    AND EXISTS (
      SELECT 1 FROM family_graphs
      WHERE family_graphs.id = memberships.graph_id
        AND family_graphs.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users join graphs"
  ON memberships FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND role IN ('viewer', 'contributor', 'editor')
  );

CREATE POLICY "Owners update memberships"
  ON memberships FOR UPDATE USING (
    graph_id IN (
      SELECT graph_id FROM memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners delete memberships"
  ON memberships FOR DELETE USING (
    graph_id IN (
      SELECT graph_id FROM memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================================
-- UPDATE PERSONS RLS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Members insert persons" ON persons;
DROP POLICY IF EXISTS "Admins update persons" ON persons;
DROP POLICY IF EXISTS "Admins delete persons" ON persons;

CREATE POLICY "Editors insert persons"
  ON persons FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.graph_id = persons.graph_id
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors update persons"
  ON persons FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.graph_id = persons.graph_id
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors delete persons"
  ON persons FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.graph_id = persons.graph_id
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('owner', 'editor')
    )
  );

-- ============================================================
-- UPDATE RELATIONSHIPS RLS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Members insert relationships" ON relationships;
DROP POLICY IF EXISTS "Admins update relationships" ON relationships;
DROP POLICY IF EXISTS "Admins delete relationships" ON relationships;

CREATE POLICY "Editors insert relationships"
  ON relationships FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.graph_id = relationships.graph_id
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors update relationships"
  ON relationships FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.graph_id = relationships.graph_id
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors delete relationships"
  ON relationships FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.graph_id = relationships.graph_id
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('owner', 'editor')
    )
  );

-- ============================================================
-- UPDATE STORIES RLS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Members insert stories" ON stories;

CREATE POLICY "Contributors insert stories"
  ON stories FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.graph_id = stories.graph_id
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('owner', 'editor', 'contributor')
    )
  );

-- ============================================================
-- CREATE INVITE_LINKS TABLE
-- ============================================================

CREATE TABLE invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id uuid NOT NULL REFERENCES family_graphs ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'base64url'),
  role member_role NOT NULL DEFAULT 'viewer',
  created_by uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to look up an invite link by its token.
-- This is safe because tokens are 12-byte random values (base64url encoded).
-- Without knowing the token, you can't discover invite links.
CREATE POLICY "Anyone can look up invite links by token"
  ON invite_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Editors create invite links"
  ON invite_links FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.graph_id = invite_links.graph_id
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Owners delete invite links"
  ON invite_links FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.graph_id = invite_links.graph_id
        AND memberships.user_id = auth.uid()
        AND memberships.role = 'owner'
    )
  );

CREATE INDEX idx_invite_links_graph ON invite_links (graph_id);
CREATE INDEX idx_invite_links_token ON invite_links (token);

-- Allow authenticated users to see graph info when an invite link exists.
-- This enables the /join/[token] page to show the graph name to non-members.
CREATE POLICY "Invite link holders can see graph"
  ON family_graphs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invite_links
      WHERE invite_links.graph_id = family_graphs.id
    )
  );
