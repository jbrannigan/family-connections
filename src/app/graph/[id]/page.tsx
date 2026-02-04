import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import PersonList from "./person-list";

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

  const isAdmin = membership.role === "admin";

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

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-2 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-white/40 hover:text-white/60"
          >
            &larr; Dashboard
          </Link>
        </div>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{graph.name}</h1>
            <p className="mt-1 text-sm text-white/40">
              Invite code:{" "}
              <code className="rounded bg-white/10 px-2 py-0.5 font-mono text-[#7fdb9a]">
                {graph.invite_code}
              </code>
            </p>
          </div>
          {isAdmin && (
            <span className="rounded-full bg-[#7fdb9a]/10 px-3 py-1 text-xs font-semibold text-[#7fdb9a]">
              Admin
            </span>
          )}
        </div>

        <PersonList
          graphId={id}
          initialPersons={persons ?? []}
          initialRelationships={relationships ?? []}
          isAdmin={isAdmin}
        />
      </main>
    </div>
  );
}
