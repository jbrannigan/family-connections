import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateArchiveText, generateArchiveJSON } from "@/lib/archive-export";
import type { StoryWithAuthor } from "@/types/database";
import { canExport } from "@/lib/roles";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "txt";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check membership (owner only)
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("graph_id", id)
    .single();

  if (!membership || !canExport(membership.role)) {
    return NextResponse.json(
      { error: "Only owners can export" },
      { status: 403 },
    );
  }

  // Fetch graph
  const { data: graph } = await supabase
    .from("family_graphs")
    .select("*")
    .eq("id", id)
    .single();

  if (!graph) {
    return NextResponse.json({ error: "Graph not found" }, { status: 404 });
  }

  // Fetch all data
  const [personsResult, relationshipsResult, storiesResult] = await Promise.all([
    supabase
      .from("persons")
      .select("*")
      .eq("graph_id", id)
      .order("display_name"),
    supabase.from("relationships").select("*").eq("graph_id", id),
    supabase
      .from("stories")
      .select("*")
      .eq("graph_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const persons = personsResult.data ?? [];
  const relationships = relationshipsResult.data ?? [];
  const storiesRaw = storiesResult.data ?? [];

  // Fetch author profiles for stories
  const authorIds = [...new Set(storiesRaw.map((s) => s.author_id))];
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

  const stories: StoryWithAuthor[] = storiesRaw.map((s) => ({
    ...s,
    author_name: profileMap.get(s.author_id) ?? null,
  }));

  // Generate the slug for the filename
  const slug = graph.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const date = new Date().toISOString().split("T")[0];

  if (format === "json") {
    const data = generateArchiveJSON(graph, persons, relationships, stories);
    const json = JSON.stringify(data, null, 2);

    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${slug}-${date}.json"`,
      },
    });
  }

  // Default: plain text
  const text = generateArchiveText(graph, persons, relationships, stories);

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-${date}.txt"`,
    },
  });
}
