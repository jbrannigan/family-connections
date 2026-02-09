-- Fix infinite recursion in memberships RLS policies
--
-- Problem: The "Owners see/update/delete graph memberships" policies on the
-- memberships table used self-referencing subqueries (SELECT from memberships
-- within a memberships policy). These triggered mutual recursion with the
-- family_graphs SELECT policy which also references memberships.
--
-- Solution: Create a SECURITY DEFINER function that checks graph ownership
-- via family_graphs.owner_id, bypassing RLS. Use this function in the
-- memberships policies instead of self-referencing subqueries.

-- Step 1: Create helper function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_graph_owner(check_graph_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_graphs
    WHERE id = check_graph_id
    AND owner_id = auth.uid()
  );
$$;

-- Step 2: Replace the recursive policies

DROP POLICY IF EXISTS "Owners see graph memberships" ON memberships;
CREATE POLICY "Owners see graph memberships" ON memberships
FOR SELECT
USING (public.is_graph_owner(graph_id));

DROP POLICY IF EXISTS "Owners update memberships" ON memberships;
CREATE POLICY "Owners update memberships" ON memberships
FOR UPDATE
USING (public.is_graph_owner(graph_id));

DROP POLICY IF EXISTS "Owners delete memberships" ON memberships;
CREATE POLICY "Owners delete memberships" ON memberships
FOR DELETE
USING (public.is_graph_owner(graph_id));
