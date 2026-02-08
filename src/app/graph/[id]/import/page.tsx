import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ImportForm from "./import-form";
import { canImport } from "@/lib/roles";

export default async function ImportPage({
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

  // Check membership — owner only
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("graph_id", id)
    .single();

  if (!membership || !canImport(membership.role)) redirect(`/graph/${id}`);

  return (
    <div className="min-h-screen bg-[#0a1410] text-white">
      <header className="border-b border-white/10 bg-[#0f1a14]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] text-lg">
              🌳
            </div>
            <span className="hidden text-lg font-bold text-[#7fdb9a] sm:inline">
              Family Connections
            </span>
          </Link>
          <span className="hidden text-sm text-white/50 sm:inline">{user.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-12">
        <div className="mb-2">
          <Link
            href={`/graph/${id}`}
            className="text-sm text-white/40 hover:text-white/60"
          >
            &larr; Back to {graph.name}
          </Link>
        </div>

        <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Import Family Tree</h1>
        <p className="mb-6 text-white/50 sm:mb-8">
          Paste a TreeDown-formatted family tree to bulk-import people and
          relationships.
        </p>

        <ImportForm graphId={id} />
      </main>
    </div>
  );
}
