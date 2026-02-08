"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeDate } from "@/lib/date-utils";
import { revalidatePath } from "next/cache";
import { canEdit, canAddStories } from "@/lib/roles";
import type { RelationshipType } from "@/types/database";

export async function updatePerson(
  graphId: string,
  personId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify editor or owner membership
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("graph_id", graphId)
    .single();

  if (!membership || !canEdit(membership.role)) {
    throw new Error("Editor access required");
  }

  // Extract and validate fields
  const displayName = (formData.get("display_name") as string)?.trim();
  if (!displayName) throw new Error("Display name is required");

  const birthDateRaw = formData.get("birth_date") as string;
  const deathDateRaw = formData.get("death_date") as string;

  // Validate dates if provided
  const birthDate = birthDateRaw?.trim()
    ? normalizeDate(birthDateRaw)
    : null;
  const deathDate = deathDateRaw?.trim()
    ? normalizeDate(deathDateRaw)
    : null;

  if (birthDateRaw?.trim() && birthDate === null) {
    throw new Error(
      "Invalid birth date format. Use YYYY, YYYY-MM, or YYYY-MM-DD",
    );
  }
  if (deathDateRaw?.trim() && deathDate === null) {
    throw new Error(
      "Invalid death date format. Use YYYY, YYYY-MM, or YYYY-MM-DD",
    );
  }

  const { error } = await supabase
    .from("persons")
    .update({
      display_name: displayName,
      given_name: (formData.get("given_name") as string)?.trim() || null,
      nickname: (formData.get("nickname") as string)?.trim() || null,
      preferred_name:
        (formData.get("preferred_name") as string)?.trim() || null,
      pronouns: (formData.get("pronouns") as string)?.trim() || null,
      birth_date: birthDate,
      death_date: deathDate,
      birth_location:
        (formData.get("birth_location") as string)?.trim() || null,
      notes: (formData.get("notes") as string)?.trim() || null,
      is_incomplete: formData.get("is_incomplete") === "true",
    })
    .eq("id", personId)
    .eq("graph_id", graphId);

  if (error) throw new Error(error.message);

  revalidatePath(`/graph/${graphId}/person/${personId}`);
}

export async function createStory(
  graphId: string,
  personId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify membership (contributor and above can add stories)
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("graph_id", graphId)
    .single();

  if (!membership || !canAddStories(membership.role)) {
    throw new Error("Contributor access required to add stories");
  }

  const content = (formData.get("content") as string)?.trim();
  if (!content) throw new Error("Story content is required");

  const isFunFact = formData.get("is_fun_fact") === "true";

  const { error } = await supabase.from("stories").insert({
    graph_id: graphId,
    person_id: personId,
    content,
    is_fun_fact: isFunFact,
    author_id: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/graph/${graphId}/person/${personId}`);
}

export async function updateStory(
  graphId: string,
  personId: string,
  storyId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const content = (formData.get("content") as string)?.trim();
  if (!content) throw new Error("Story content is required");

  const isFunFact = formData.get("is_fun_fact") === "true";

  // RLS enforces author-only update; we also check explicitly
  const { error } = await supabase
    .from("stories")
    .update({ content, is_fun_fact: isFunFact })
    .eq("id", storyId)
    .eq("author_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/graph/${graphId}/person/${personId}`);
}

export async function deleteStory(
  graphId: string,
  personId: string,
  storyId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // RLS enforces author-only delete
  const { error } = await supabase
    .from("stories")
    .delete()
    .eq("id", storyId)
    .eq("author_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/graph/${graphId}/person/${personId}`);
}

const VALID_RELATIONSHIP_TYPES: RelationshipType[] = [
  "biological_parent",
  "adoptive_parent",
  "step_parent",
  "spouse",
  "ex_spouse",
  "partner",
];

const PARENT_TYPES = new Set<string>([
  "biological_parent",
  "adoptive_parent",
  "step_parent",
]);

const SPOUSE_TYPES = new Set<string>(["spouse", "ex_spouse", "partner"]);

export async function createRelationship(
  graphId: string,
  personId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify editor or owner membership
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("graph_id", graphId)
    .single();

  if (!membership || !canEdit(membership.role)) {
    throw new Error("Editor access required");
  }

  // Extract and validate fields
  const type = formData.get("type") as string;
  const targetPersonId = formData.get("target_person_id") as string;
  const direction = formData.get("direction") as string;

  if (!type || !VALID_RELATIONSHIP_TYPES.includes(type as RelationshipType)) {
    throw new Error("Invalid relationship type");
  }

  if (!targetPersonId) {
    throw new Error("Please select a person");
  }

  if (targetPersonId === personId) {
    throw new Error("Cannot create a relationship with the same person");
  }

  // Verify target person exists in this graph
  const { data: targetPerson } = await supabase
    .from("persons")
    .select("id")
    .eq("id", targetPersonId)
    .eq("graph_id", graphId)
    .single();

  if (!targetPerson) {
    throw new Error("Selected person not found in this graph");
  }

  // Determine person_a and person_b based on direction and type
  let personA: string;
  let personB: string;

  if (PARENT_TYPES.has(type)) {
    // For parent types: person_a = parent, person_b = child
    if (direction === "current_is_a") {
      personA = personId;
      personB = targetPersonId;
    } else {
      personA = targetPersonId;
      personB = personId;
    }
  } else {
    // For spouse types: direction is irrelevant, store current as person_a
    personA = personId;
    personB = targetPersonId;
  }

  // For spouse types, check both directions for existing duplicate
  if (SPOUSE_TYPES.has(type)) {
    const { data: existing } = await supabase
      .from("relationships")
      .select("id")
      .eq("graph_id", graphId)
      .eq("type", type)
      .or(
        `and(person_a.eq.${personA},person_b.eq.${personB}),and(person_a.eq.${personB},person_b.eq.${personA})`,
      )
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error("This relationship already exists");
    }
  }

  const { error } = await supabase.from("relationships").insert({
    graph_id: graphId,
    person_a: personA,
    person_b: personB,
    type,
    created_by: user.id,
  });

  if (error) {
    // Handle unique constraint violation
    if (error.code === "23505") {
      throw new Error("This relationship already exists");
    }
    throw new Error(error.message);
  }

  revalidatePath(`/graph/${graphId}/person/${personId}`);
  revalidatePath(`/graph/${graphId}/person/${targetPersonId}`);
}

export async function deleteRelationship(
  graphId: string,
  personId: string,
  relationshipId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify editor or owner membership
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("graph_id", graphId)
    .single();

  if (!membership || !canEdit(membership.role)) {
    throw new Error("Editor access required");
  }

  // Fetch the relationship to verify it involves this person
  const { data: rel } = await supabase
    .from("relationships")
    .select("person_a, person_b")
    .eq("id", relationshipId)
    .eq("graph_id", graphId)
    .single();

  if (!rel) {
    throw new Error("Relationship not found");
  }

  if (rel.person_a !== personId && rel.person_b !== personId) {
    throw new Error("Relationship does not involve this person");
  }

  const otherPersonId =
    rel.person_a === personId ? rel.person_b : rel.person_a;

  const { error } = await supabase
    .from("relationships")
    .delete()
    .eq("id", relationshipId)
    .eq("graph_id", graphId);

  if (error) throw new Error(error.message);

  revalidatePath(`/graph/${graphId}/person/${personId}`);
  revalidatePath(`/graph/${graphId}/person/${otherPersonId}`);
}
