"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { canInvite } from "@/lib/roles";
import type { MemberRole, InviteLink } from "@/types/database";

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
