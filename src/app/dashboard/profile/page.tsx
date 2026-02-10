import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ProfileForm from "./profile-form";
import type { MemberRole } from "@/types/database";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  // Fetch user's graphs via memberships
  const { data: memberships } = await supabase
    .from("memberships")
    .select("graph_id, role, family_graphs(id, name)")
    .eq("user_id", user.id);

  type GraphRow = { id: string; name: string };

  const graphs =
    memberships?.map((m) => {
      const fg = m.family_graphs as unknown as GraphRow;
      return { id: fg.id, name: fg.name, role: m.role as MemberRole };
    }) ?? [];

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
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-12">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-white/40 hover:text-white/60"
          >
            &larr; Dashboard
          </Link>
        </div>

        <h1 className="mb-8 text-2xl font-bold sm:text-3xl">Your Profile</h1>

        <ProfileForm
          userId={user.id}
          email={user.email ?? ""}
          displayName={profile?.display_name ?? ""}
          avatarUrl={profile?.avatar_url ?? null}
          graphs={graphs}
        />
      </main>
    </div>
  );
}
