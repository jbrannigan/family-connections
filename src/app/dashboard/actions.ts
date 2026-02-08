"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { MemberRole } from "@/types/database";

export async function createGraph(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name?.trim()) throw new Error("Name is required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Create the family graph
  const { data: graph, error: graphError } = await supabase
    .from("family_graphs")
    .insert({ name: name.trim(), owner_id: user.id })
    .select()
    .single();

  if (graphError || !graph) {
    throw new Error(graphError?.message ?? "Failed to create graph");
  }

  // Add creator as owner
  const { error: memberError } = await supabase
    .from("memberships")
    .insert({ user_id: user.id, graph_id: graph.id, role: "owner" });

  if (memberError) {
    throw new Error(memberError.message);
  }

  redirect(`/graph/${graph.id}`);
}

export async function joinGraph(formData: FormData) {
  const code = (formData.get("code") as string)?.trim().toLowerCase();
  if (!code) throw new Error("Invite code is required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Find graph by invite code
  const { data: graph } = await supabase
    .from("family_graphs")
    .select("id")
    .eq("invite_code", code)
    .single();

  if (!graph) {
    throw new Error("Invalid invite code");
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("memberships")
    .select("graph_id")
    .eq("user_id", user.id)
    .eq("graph_id", graph.id)
    .single();

  if (!existing) {
    const { error: joinError } = await supabase
      .from("memberships")
      .insert({ user_id: user.id, graph_id: graph.id, role: "viewer" });

    if (joinError) {
      throw new Error(joinError.message);
    }
  }

  redirect(`/graph/${graph.id}`);
}

export async function joinGraphViaInviteLink(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Look up invite link by token
  const { data: inviteLink } = await supabase
    .from("invite_links")
    .select("graph_id, role")
    .eq("token", token)
    .single();

  if (!inviteLink) {
    throw new Error("Invalid or expired invite link");
  }

  // Validate role is not owner (can't invite as owner)
  const role = inviteLink.role as MemberRole;
  if (role === "owner") {
    throw new Error("Invalid invite link");
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("memberships")
    .select("graph_id")
    .eq("user_id", user.id)
    .eq("graph_id", inviteLink.graph_id)
    .single();

  if (!existing) {
    const { error: joinError } = await supabase
      .from("memberships")
      .insert({
        user_id: user.id,
        graph_id: inviteLink.graph_id,
        role,
      });

    if (joinError) {
      throw new Error(joinError.message);
    }
  }

  redirect(`/graph/${inviteLink.graph_id}`);
}
