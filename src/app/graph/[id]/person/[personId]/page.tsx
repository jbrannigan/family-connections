import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import PersonDetail from "./person-detail";
import BackButton from "./back-button";
import { canEdit, canAddStories } from "@/lib/roles";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string; personId: string }>;
}) {
  const { id, personId } = await params;
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

  // Fetch the person
  const { data: person } = await supabase
    .from("persons")
    .select("*")
    .eq("id", personId)
    .eq("graph_id", id)
    .single();

  if (!person) redirect(`/graph/${id}`);

  // Fetch all persons in graph (for relationship name resolution + union cards)
  const { data: allPersons } = await supabase
    .from("persons")
    .select("*")
    .eq("graph_id", id);

  // Fetch relationships involving this person
  const { data: relationships } = await supabase
    .from("relationships")
    .select("*")
    .eq("graph_id", id)
    .or(`person_a.eq.${personId},person_b.eq.${personId}`);

  // Fetch stories for this person
  const { data: storiesRaw } = await supabase
    .from("stories")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false });

  // Fetch author profiles for stories
  const authorIds = [
    ...new Set((storiesRaw ?? []).map((s) => s.author_id)),
  ];
  const { data: authorProfiles } =
    authorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", authorIds)
      : { data: [] };

  const profileMap = new Map(
    (authorProfiles ?? []).map(
      (p: { id: string; display_name: string | null }) => [
        p.id,
        p.display_name,
      ],
    ),
  );

  const stories = (storiesRaw ?? []).map((s) => ({
    ...s,
    author_name: profileMap.get(s.author_id) ?? null,
  }));

  const isEditor = canEdit(membership.role);
  const isContributor = canAddStories(membership.role);

  return (
    <div className="min-h-screen bg-[#0a1410] text-white">
      <header className="border-b border-white/10 bg-[#0f1a14]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] text-lg">
              🌳
            </div>
            <span className="text-lg font-bold text-[#7fdb9a]">
              Family Connections
            </span>
          </Link>
          <span className="text-sm text-white/50">{user.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-6">
          <BackButton graphId={id} graphName={graph.name} />
        </div>

        <PersonDetail
          graphId={id}
          person={person}
          allPersons={allPersons ?? []}
          relationships={relationships ?? []}
          stories={stories}
          isEditor={isEditor}
          canAddStories={isContributor}
          currentUserId={user.id}
        />
      </main>
    </div>
  );
}
