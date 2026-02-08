-- Migration: Graph Settings — add missing RLS policies
-- Feature 015: Graph Settings

-- Allow owners to see all memberships in their graphs
-- (existing policy "Users see own memberships" allows users to see their own row;
--  this additional policy lets owners see all rows for graphs they own)
CREATE POLICY "Owners see graph memberships"
  ON memberships FOR SELECT USING (
    graph_id IN (
      SELECT graph_id FROM memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Allow owners to delete their graphs
CREATE POLICY "Owners delete graphs"
  ON family_graphs FOR DELETE USING (auth.uid() = owner_id);
