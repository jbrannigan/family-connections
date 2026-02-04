import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import SignOutButton from "./sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch user's family graphs via memberships
  const { data: memberships } = await supabase
    .from("memberships")
    .select("graph_id, role, family_graphs(id, name, invite_code)")
    .eq("user_id", user.id);

  type GraphRow = { id: string; name: string; invite_code: string };

  const graphs =
    memberships?.map((m) => {
      // Supabase returns the joined row as an object (single FK) or array
      const fg = m.family_graphs as unknown as GraphRow;
      return { ...fg, role: m.role as string };
    }) ?? [];

  return (
    <div className="min-h-screen bg-[#0a1410] text-white">
      <header className="border-b border-white/10 bg-[#0f1a14]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] text-lg">
              🌳
            </div>
            <span className="text-lg font-bold text-[#7fdb9a]">
              Family Connections
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/50">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Your Family Graphs</h1>
          <Link
            href="/dashboard/new"
            className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-6 py-2.5 font-semibold text-[#0f1a14] transition hover:opacity-90"
          >
            + New Graph
          </Link>
        </div>

        {graphs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 p-16 text-center">
            <div className="mb-4 text-5xl">🌱</div>
            <h2 className="mb-2 text-xl font-semibold">
              No family graphs yet
            </h2>
            <p className="mb-6 text-white/50">
              Create your first family graph or join one with an invite code.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/dashboard/new"
                className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-6 py-2.5 font-semibold text-[#0f1a14]"
              >
                Create Graph
              </Link>
              <Link
                href="/dashboard/join"
                className="rounded-xl border border-white/20 px-6 py-2.5 font-semibold"
              >
                Join with Code
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {graphs.map((graph) => (
              <Link
                key={graph.id}
                href={`/graph/${graph.id}`}
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-[#7fdb9a]/30 hover:bg-[#7fdb9a]/5"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#7fdb9a]/20 to-[#4a9d6a]/10 text-2xl">
                  🌳
                </div>
                <h3 className="mb-1 text-lg font-semibold">{graph.name}</h3>
                <p className="text-sm capitalize text-white/50">{graph.role}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
