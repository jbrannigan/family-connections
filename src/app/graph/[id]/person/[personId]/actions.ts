"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeDate } from "@/lib/date-utils";
import { revalidatePath } from "next/cache";

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

  // Verify admin membership
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("graph_id", graphId)
    .single();

  if (!membership || membership.role !== "admin") {
    throw new Error("Admin access required");
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

  // Verify membership (any member can add stories)
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("graph_id", graphId)
    .single();

  if (!membership) throw new Error("Not a member of this graph");

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
