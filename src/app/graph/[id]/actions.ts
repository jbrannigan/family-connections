"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canInvite, canManageMembers } from "@/lib/roles";
import type { MemberRole, InviteLink, MemberInfo } from "@/types/database";

/**
 * Get or create an invite link for a specific role.
 * If a link for this graph+role already exists, returns it.
 * Otherwise, creates a new one.
 */
export async function getOrCreateInviteLink(
  graphId: string,
  role: MemberRole,
): Promise<InviteLink> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify membership with invite permission
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("graph_id", graphId)
    .single();

  if (!membership || !canInvite(membership.role)) {
    throw new Error("You don't have permission to create invite links");
  }

  // Can't create invite links for owner role
  if (role === "owner") {
    throw new Error("Cannot create invite links for the Owner role");
  }

  // Check the inviter isn't trying to invite above their max role
  const { getMaxInviteRole, getInvitableRoles } = await import("@/lib/roles");
  const maxRole = getMaxInviteRole(membership.role);
  const invitableRoles = getInvitableRoles(membership.role);

  if (!maxRole || !invitableRoles.includes(role)) {
    throw new Error(`You cannot invite with the ${role} role`);
  }

  // Check if a link for this graph+role already exists
  const { data: existing } = await supabase
    .from("invite_links")
    .select("*")
    .eq("graph_id", graphId)
    .eq("role", role)
    .single();

  if (existing) {
    return existing as InviteLink;
  }

  // Create new invite link
  const { data: newLink, error } = await supabase
    .from("invite_links")
    .insert({
      graph_id: graphId,
      role,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !newLink) {
    throw new Error(error?.message ?? "Failed to create invite link");
  }

  revalidatePath(`/graph/${graphId}`);
  return newLink as InviteLink;
}

/**
 * Fetch all invite links for a graph.
 */
export async function getInviteLinks(
  graphId: string,
): Promise<InviteLink[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify membership with invite permission
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("graph_id", graphId)
    .single();

  if (!membership || !canInvite(membership.role)) {
    return [];
  }

  const { data: links } = await supabase
    .from("invite_links")
    .select("*")
    .eq("graph_id", graphId)
    .order("created_at");

  return (links ?? []) as InviteLink[];
}

/**
 * Delete an invite link (owner only).
 */
export async function deleteInviteLink(
  graphId: string,
  linkId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Only owners can delete invite links
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("graph_id", graphId)
    .single();

  if (!membership || membership.role !== "owner") {
    throw new Error("Only owners can delete invite links");
  }

  const { error } = await supabase
    .from("invite_links")
    .delete()
    .eq("id", linkId)
    .eq("graph_id", graphId);

  if (error) throw new Error(error.message);

  revalidatePath(`/graph/${graphId}`);
}

// ── Graph Settings actions ────────────────────────────────

/** Helper: verify caller is authenticated and is the owner of this graph. */
async function requireOwner(graphId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("graph_id", graphId)
    .single();

  if (!membership || !canManageMembers(membership.role)) {
    throw new Error("Only the graph owner can manage settings");
  }

  return { supabase, user };
}

/**
 * Fetch all members of a graph with their profile info.
 * Owner only.
 */
export async function getMembers(graphId: string): Promise<MemberInfo[]> {
  const { supabase } = await requireOwner(graphId);

  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, role, created_at, profiles(display_name)")
    .eq("graph_id", graphId)
    .order("created_at");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    // profiles is a joined object (many-to-one via user_id FK)
    const profile = row.profiles as unknown as { display_name: string | null } | null;
    return {
      user_id: row.user_id,
      role: row.role as MemberRole,
      created_at: row.created_at,
      display_name: profile?.display_name ?? null,
    };
  });
}

/**
 * Rename a graph. Owner only.
 */
export async function renameGraph(
  graphId: string,
  newName: string,
): Promise<void> {
  const { supabase } = await requireOwner(graphId);

  const trimmed = newName.trim();
  if (!trimmed) throw new Error("Graph name cannot be empty");
  if (trimmed.length > 100) throw new Error("Graph name is too long (max 100 characters)");

  const { error } = await supabase
    .from("family_graphs")
    .update({ name: trimmed })
    .eq("id", graphId);

  if (error) throw new Error(error.message);

  revalidatePath(`/graph/${graphId}`);
}

/**
 * Change a member's role. Owner only.
 * Cannot change own role or set role to "owner".
 */
export async function updateMemberRole(
  graphId: string,
  targetUserId: string,
  newRole: MemberRole,
): Promise<void> {
  const { supabase, user } = await requireOwner(graphId);

  if (targetUserId === user.id) {
    throw new Error("You cannot change your own role");
  }

  if (newRole === "owner") {
    throw new Error("Cannot promote to owner. Use Transfer Ownership instead.");
  }

  const validRoles: MemberRole[] = ["editor", "contributor", "viewer"];
  if (!validRoles.includes(newRole)) {
    throw new Error(`Invalid role: ${newRole}`);
  }

  const { error } = await supabase
    .from("memberships")
    .update({ role: newRole })
    .eq("user_id", targetUserId)
    .eq("graph_id", graphId);

  if (error) throw new Error(error.message);

  revalidatePath(`/graph/${graphId}`);
}

/**
 * Remove a member from the graph. Owner only.
 * Cannot remove self.
 */
export async function removeMember(
  graphId: string,
  targetUserId: string,
): Promise<void> {
  const { supabase, user } = await requireOwner(graphId);

  if (targetUserId === user.id) {
    throw new Error("You cannot remove yourself from the graph");
  }

  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("user_id", targetUserId)
    .eq("graph_id", graphId);

  if (error) throw new Error(error.message);

  revalidatePath(`/graph/${graphId}`);
}

/**
 * Delete a graph. Owner only.
 * Requires typed confirmation matching the graph name.
 * CASCADE will delete all memberships, persons, relationships, stories, and invite links.
 */
export async function deleteGraph(
  graphId: string,
  confirmationName: string,
): Promise<void> {
  const { supabase } = await requireOwner(graphId);

  // Fetch graph name for confirmation
  const { data: graph } = await supabase
    .from("family_graphs")
    .select("name")
    .eq("id", graphId)
    .single();

  if (!graph) throw new Error("Graph not found");

  if (confirmationName.trim() !== graph.name) {
    throw new Error("Confirmation name does not match the graph name");
  }

  const { error } = await supabase
    .from("family_graphs")
    .delete()
    .eq("id", graphId);

  if (error) throw new Error(error.message);

  redirect("/dashboard");
}

/**
 * Transfer ownership of a graph to another member. Owner only.
 * The current owner is demoted to editor. The target becomes the new owner.
 *
 * Note: This uses sequential updates (not a transaction) since the Supabase
 * client SDK doesn't support transactions. The order is chosen to minimize
 * inconsistency risk on partial failure.
 */
export async function transferOwnership(
  graphId: string,
  newOwnerId: string,
): Promise<void> {
  const { supabase, user } = await requireOwner(graphId);

  if (newOwnerId === user.id) {
    throw new Error("You are already the owner");
  }

  // Verify target is a member of this graph
  const { data: targetMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", newOwnerId)
    .eq("graph_id", graphId)
    .single();

  if (!targetMembership) {
    throw new Error("Target user is not a member of this graph");
  }

  // Step 1: Promote target to owner (if this fails, nothing changed)
  const { error: promoteError } = await supabase
    .from("memberships")
    .update({ role: "owner" })
    .eq("user_id", newOwnerId)
    .eq("graph_id", graphId);

  if (promoteError) throw new Error(`Failed to promote new owner: ${promoteError.message}`);

  // Step 2: Demote self to editor
  const { error: demoteError } = await supabase
    .from("memberships")
    .update({ role: "editor" })
    .eq("user_id", user.id)
    .eq("graph_id", graphId);

  if (demoteError) throw new Error(`Failed to update your role: ${demoteError.message}`);

  // Step 3: Update family_graphs.owner_id
  const { error: ownerError } = await supabase
    .from("family_graphs")
    .update({ owner_id: newOwnerId })
    .eq("id", graphId);

  if (ownerError) throw new Error(`Failed to update graph owner: ${ownerError.message}`);

  revalidatePath(`/graph/${graphId}`);
}
