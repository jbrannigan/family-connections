import type { MemberRole } from "@/types/database";

/**
 * Role hierarchy (highest to lowest):
 *   owner > editor > contributor > viewer
 *
 * Legacy roles are mapped:
 *   admin → owner
 *   member → viewer
 */

const ROLE_LEVEL: Record<string, number> = {
  owner: 4,
  editor: 3,
  contributor: 2,
  viewer: 1,
  // Legacy mappings
  admin: 4,
  member: 1,
};

/** Normalize legacy role names to the new 4-tier system. */
export function normalizeRole(role: string): MemberRole {
  if (role === "admin") return "owner";
  if (role === "member") return "viewer";
  return role as MemberRole;
}

/** Check if the role has at least the given minimum level. */
function hasMinRole(role: string, minRole: MemberRole): boolean {
  return (ROLE_LEVEL[role] ?? 0) >= (ROLE_LEVEL[minRole] ?? 0);
}

/** Display label for a role (capitalized). */
export function getRoleLabel(role: string): string {
  const normalized = normalizeRole(role);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// ── Permission checks ──────────────────────────────────────

/** Can edit persons, relationships, and tree structure? (Owner, Editor) */
export function canEdit(role: string): boolean {
  return hasMinRole(role, "editor");
}

/** Can add stories? (Owner, Editor, Contributor) */
export function canAddStories(role: string): boolean {
  return hasMinRole(role, "contributor");
}

/** Can import TreeDown data? (Owner only) */
export function canImport(role: string): boolean {
  return hasMinRole(role, "owner");
}

/** Can export data? (Owner only) */
export function canExport(role: string): boolean {
  return hasMinRole(role, "owner");
}

/** Can create invite links? (Owner, Editor) */
export function canInvite(role: string): boolean {
  return hasMinRole(role, "editor");
}

/** Can manage members (promote, demote, remove)? (Owner only) */
export function canManageMembers(role: string): boolean {
  return hasMinRole(role, "owner");
}

/** Can delete the graph? (Owner only) */
export function canDeleteGraph(role: string): boolean {
  return hasMinRole(role, "owner");
}

/** Can activate Guest Mode? (Owner, Editor) */
export function canUseGuestMode(role: string): boolean {
  return hasMinRole(role, "editor");
}

/**
 * Get the maximum role an inviter can assign.
 * Owner can invite up to Editor.
 * Editor can invite up to Contributor.
 */
export function getMaxInviteRole(inviterRole: string): MemberRole | null {
  const normalized = normalizeRole(inviterRole);
  if (normalized === "owner") return "editor";
  if (normalized === "editor") return "contributor";
  return null; // Contributors and Viewers can't invite
}

/**
 * Get the list of roles available for invite based on the inviter's role.
 * Returns roles in order from highest to lowest that the inviter can assign.
 */
export function getInvitableRoles(inviterRole: string): MemberRole[] {
  const normalized = normalizeRole(inviterRole);
  if (normalized === "owner") return ["editor", "contributor", "viewer"];
  if (normalized === "editor") return ["contributor", "viewer"];
  return [];
}
