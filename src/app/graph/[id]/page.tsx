import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GraphPageClient from "./graph-page-client";
import type { MemberRole } from "@/types/database";

export default async function GraphPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch graph details
  const { data: graph } = await supabase
    .from("family_graphs")
    .select("*")
    .eq("id", id)
    .single();

  if (!graph) redirect("/dashboard");

  // Check membership
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("graph_id", id)
    .single();

  if (!membership) redirect("/dashboard");

  const role = membership.role as MemberRole;

  // Fetch persons
  const { data: persons } = await supabase
    .from("persons")
    .select("*")
    .eq("graph_id", id)
    .order("display_name");

  // Fetch relationships
  const { data: relationships } = await supabase
    .from("relationships")
    .select("*")
    .eq("graph_id", id);

  // Fetch story counts per person
  const { data: storyRows } = await supabase
    .from("stories")
    .select("person_id")
    .eq("graph_id", id);

  const storyCountMap: Record<string, number> = {};
  for (const row of storyRows ?? []) {
    storyCountMap[row.person_id] = (storyCountMap[row.person_id] ?? 0) + 1;
  }

  return (
    <GraphPageClient
      graphId={id}
      graphName={graph.name}
      role={role}
      userId={user.id}
      userEmail={user.email ?? ""}
      persons={persons ?? []}
      relationships={relationships ?? []}
      storyCountMap={storyCountMap}
    />
  );
}
