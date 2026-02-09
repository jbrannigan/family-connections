"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { canEdit } from "@/lib/roles";
import type { Relationship } from "@/types/database";
import { wouldCreateCycle } from "@/lib/relationships";

const PARENT_TYPES = new Set<string>([
  "biological_parent",
  "adoptive_parent",
  "step_parent",
]);

const SPOUSE_TYPES = new Set<string>(["spouse", "ex_spouse", "partner"]);

/**
 * Merge two persons into one. The "keep" person absorbs all relationships,
 * stories, and metadata from the "remove" person, then the "remove" person
 * is deleted.
 *
 * Note: Supabase JS SDK does not support client-side transactions, so these
 * operations run sequentially. The ordering (reassign → merge metadata → delete)
 * minimizes data loss risk if a mid-operation failure occurs.
 */
export async function mergePersons(
  graphId: string,
  keepPersonId: string,
  removePersonId: string,
): Promise<{ success: true; warnings: string[] } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Verify editor or owner membership
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("graph_id", graphId)
    .single();

  if (!membership || !canEdit(membership.role)) {
    return { success: false, error: "Editor access required" };
  }

  // Validate both persons exist in this graph
  const { data: keepPerson } = await supabase
    .from("persons")
    .select("*")
    .eq("id", keepPersonId)
    .eq("graph_id", graphId)
    .single();

  if (!keepPerson) {
    return { success: false, error: "Person to keep not found in this graph" };
  }

  const { data: removePerson } = await supabase
    .from("persons")
    .select("*")
    .eq("id", removePersonId)
    .eq("graph_id", graphId)
    .single();

  if (!removePerson) {
    return { success: false, error: "Person to remove not found in this graph" };
  }

  if (keepPersonId === removePersonId) {
    return { success: false, error: "Cannot merge a person with themselves" };
  }

  const warnings: string[] = [];

  // --- Step 1: Fetch and reassign relationships ---

  // Fetch ALL relationships for cycle checking
  const { data: allRels } = await supabase
    .from("relationships")
    .select("id, graph_id, person_a, person_b, type, start_date, end_date, created_by, created_at")
    .eq("graph_id", graphId);

  const allRelationships = (allRels ?? []) as Relationship[];

  // Fetch relationships involving the person to remove
  const { data: removeRels } = await supabase
    .from("relationships")
    .select("id, graph_id, person_a, person_b, type, start_date, end_date, created_by, created_at")
    .eq("graph_id", graphId)
    .or(`person_a.eq.${removePersonId},person_b.eq.${removePersonId}`);

  const relsToReassign = (removeRels ?? []) as Relationship[];

  // Track which relationships we've updated so we can maintain an accurate
  // picture for cycle detection
  const updatedRelationships = allRelationships.filter(
    (r) => r.person_a !== removePersonId && r.person_b !== removePersonId,
  );

  for (const rel of relsToReassign) {
    const newPersonA = rel.person_a === removePersonId ? keepPersonId : rel.person_a;
    const newPersonB = rel.person_b === removePersonId ? keepPersonId : rel.person_b;

    // Skip self-referencing relationships (both persons were involved)
    if (newPersonA === newPersonB) {
      await supabase.from("relationships").delete().eq("id", rel.id);
      warnings.push(
        `Removed self-referencing ${rel.type} relationship`,
      );
      continue;
    }

    // Check for existing duplicate relationship
    let isDuplicate = false;

    if (SPOUSE_TYPES.has(rel.type)) {
      // For spouse types, check both directions
      const { data: existing } = await supabase
        .from("relationships")
        .select("id")
        .eq("graph_id", graphId)
        .eq("type", rel.type)
        .or(
          `and(person_a.eq.${newPersonA},person_b.eq.${newPersonB}),and(person_a.eq.${newPersonB},person_b.eq.${newPersonA})`,
        )
        .neq("id", rel.id)
        .limit(1);

      isDuplicate = (existing?.length ?? 0) > 0;
    } else {
      // For parent types, check exact direction
      const { data: existing } = await supabase
        .from("relationships")
        .select("id")
        .eq("graph_id", graphId)
        .eq("type", rel.type)
        .eq("person_a", newPersonA)
        .eq("person_b", newPersonB)
        .neq("id", rel.id)
        .limit(1);

      isDuplicate = (existing?.length ?? 0) > 0;
    }

    if (isDuplicate) {
      await supabase.from("relationships").delete().eq("id", rel.id);
      warnings.push(
        `Removed duplicate ${rel.type} relationship`,
      );
      continue;
    }

    // For parent types, check if reassignment would create a cycle
    if (PARENT_TYPES.has(rel.type)) {
      if (wouldCreateCycle(newPersonA, newPersonB, updatedRelationships)) {
        await supabase.from("relationships").delete().eq("id", rel.id);
        warnings.push(
          `Removed ${rel.type} relationship that would create a circular ancestor chain`,
        );
        continue;
      }
    }

    // Reassign the relationship
    const { error: updateError } = await supabase
      .from("relationships")
      .update({ person_a: newPersonA, person_b: newPersonB })
      .eq("id", rel.id);

    if (updateError) {
      // Handle unique constraint violation (race condition)
      if (updateError.code === "23505") {
        await supabase.from("relationships").delete().eq("id", rel.id);
        warnings.push(
          `Removed duplicate ${rel.type} relationship (constraint)`,
        );
        continue;
      }
      return { success: false, error: `Failed to reassign relationship: ${updateError.message}` };
    }

    // Track the updated relationship for future cycle checks
    updatedRelationships.push({
      ...rel,
      person_a: newPersonA,
      person_b: newPersonB,
    });
  }

  // --- Step 2: Reassign stories ---
  const { error: storyError } = await supabase
    .from("stories")
    .update({ person_id: keepPersonId })
    .eq("person_id", removePersonId)
    .eq("graph_id", graphId);

  if (storyError) {
    return { success: false, error: `Failed to reassign stories: ${storyError.message}` };
  }

  // --- Step 3: Merge metadata (fill nulls on keeper from removed) ---
  const fieldsToMerge = [
    "given_name",
    "nickname",
    "preferred_name",
    "pronouns",
    "birth_date",
    "death_date",
    "birth_location",
    "avatar_url",
  ] as const;

  type MergeField = (typeof fieldsToMerge)[number];

  const updates: Record<string, string | boolean> = {};

  for (const field of fieldsToMerge) {
    if (
      keepPerson[field as MergeField] === null &&
      removePerson[field as MergeField] !== null
    ) {
      updates[field] = removePerson[field as MergeField] as string;
    }
  }

  // Merge notes: concatenate if both have content
  if (keepPerson.notes && removePerson.notes) {
    updates.notes = `${keepPerson.notes}\n\n${removePerson.notes}`;
  } else if (!keepPerson.notes && removePerson.notes) {
    updates.notes = removePerson.notes;
  }

  // Set is_incomplete to false if either was complete
  if (keepPerson.is_incomplete && !removePerson.is_incomplete) {
    updates.is_incomplete = false;
  }

  if (Object.keys(updates).length > 0) {
    const { error: metaError } = await supabase
      .from("persons")
      .update(updates)
      .eq("id", keepPersonId)
      .eq("graph_id", graphId);

    if (metaError) {
      return { success: false, error: `Failed to merge metadata: ${metaError.message}` };
    }
  }

  // --- Step 4: Delete the removed person ---
  const { error: deleteError } = await supabase
    .from("persons")
    .delete()
    .eq("id", removePersonId)
    .eq("graph_id", graphId);

  if (deleteError) {
    return { success: false, error: `Failed to delete merged person: ${deleteError.message}` };
  }

  // --- Step 5: Revalidate paths ---
  revalidatePath(`/graph/${graphId}`);
  revalidatePath(`/graph/${graphId}/person/${keepPersonId}`);

  return { success: true, warnings };
}
