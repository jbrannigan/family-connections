import { createClient } from "@/lib/supabase/server";
import { getRoleLabel } from "@/lib/roles";
import Link from "next/link";
import JoinButton from "./join-button";
import type { MemberRole } from "@/types/database";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Look up the invite link
  const { data: inviteLink } = await supabase
    .from("invite_links")
    .select("graph_id, role")
    .eq("token", token)
    .single();

  if (!inviteLink) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a1410] text-white">
        <div className="mx-4 max-w-md text-center">
          <div className="mb-4 text-5xl">🔗</div>
          <h1 className="mb-2 text-2xl font-bold">Invalid Invite Link</h1>
          <p className="mb-6 text-white/50">
            This invite link is invalid or has been revoked. Please ask the
            family graph owner for a new link.
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-6 py-3 font-semibold text-[#0f1a14] transition hover:opacity-90"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const role = inviteLink.role as MemberRole;

  // Fetch graph name (use service-level read — invite_links references graph_id)
  const { data: graph } = await supabase
    .from("family_graphs")
    .select("id, name")
    .eq("id", inviteLink.graph_id)
    .single();

  const graphName = graph?.name ?? "Family Graph";

  // Check if the user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If logged in, check if already a member
  let alreadyMember = false;
  if (user) {
    const { data: existing } = await supabase
      .from("memberships")
      .select("graph_id")
      .eq("user_id", user.id)
      .eq("graph_id", inviteLink.graph_id)
      .single();

    alreadyMember = !!existing;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a472a] via-[#2d5a3d] to-[#1e3a28]">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1a14] p-8 text-white">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] text-xl">
            🌳
          </div>
          <span className="text-xl font-bold text-[#7fdb9a]">
            Family Connections
          </span>
        </Link>

        <div className="mb-6 text-center">
          <div className="mb-3 text-4xl">🤝</div>
          <h1 className="mb-1 text-2xl font-bold">
            You&apos;ve been invited!
          </h1>
          <p className="text-white/50">
            Join{" "}
            <span className="font-semibold text-white">{graphName}</span>
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="mb-1 text-xs uppercase tracking-wider text-white/40">
            You&apos;ll join as
          </p>
          <span className="inline-block rounded-full bg-[#7fdb9a]/10 px-4 py-1.5 text-sm font-semibold text-[#7fdb9a]">
            {getRoleLabel(role)}
          </span>
          <p className="mt-2 text-xs text-white/40">
            {role === "editor" &&
              "You can edit family members, relationships, and add stories."}
            {role === "contributor" &&
              "You can view the tree and add stories about family members."}
            {role === "viewer" &&
              "You can view the family tree and read stories."}
          </p>
        </div>

        {alreadyMember ? (
          <div className="text-center">
            <p className="mb-4 text-sm text-white/50">
              You&apos;re already a member of this graph.
            </p>
            <Link
              href={`/graph/${inviteLink.graph_id}`}
              className="inline-block w-full rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] py-3 text-center font-semibold text-[#0f1a14] transition hover:opacity-90"
            >
              Open Graph
            </Link>
          </div>
        ) : user ? (
          <JoinButton token={token} />
        ) : (
          <div className="space-y-3">
            <Link
              href={`/auth/login?redirect=/join/${token}`}
              className="block w-full rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] py-3 text-center font-semibold text-[#0f1a14] transition hover:opacity-90"
            >
              Sign In to Join
            </Link>
            <p className="text-center text-xs text-white/40">
              You&apos;ll need to sign in or create an account first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
