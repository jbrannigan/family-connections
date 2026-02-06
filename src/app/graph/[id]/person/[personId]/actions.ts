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
