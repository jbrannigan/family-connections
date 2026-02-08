"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Person, Relationship, StoryWithAuthor } from "@/types/database";
import { formatDateForDisplay } from "@/lib/date-utils";
import { resolveUnions, formatUnionDateRange } from "@/lib/union-utils";
import type { Union } from "@/lib/union-utils";
import { updatePerson } from "./actions";
import StorySection from "./story-section";

const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  biological_parent: "Biological",
  adoptive_parent: "Adoptive",
  step_parent: "Step",
  spouse: "Spouse",
  ex_spouse: "Ex-spouse",
  partner: "Partner",
};

interface PersonDetailProps {
  graphId: string;
  person: Person;
  allPersons: Person[];
  relationships: Relationship[];
  stories: StoryWithAuthor[];
  isEditor: boolean;
  canAddStories: boolean;
  currentUserId: string;
}

interface GroupedRelationships {
  parents: { id: string; name: string; type: string }[];
  children: { id: string; name: string; type: string }[];
}

function groupRelationships(
  personId: string,
  relationships: Relationship[],
  allPersons: Person[],
): GroupedRelationships {
  const parents: GroupedRelationships["parents"] = [];
  const children: GroupedRelationships["children"] = [];

  const parentTypes = new Set([
    "biological_parent",
    "adoptive_parent",
    "step_parent",
  ]);

  for (const rel of relationships) {
    const isA = rel.person_a === personId;
    const otherId = isA ? rel.person_b : rel.person_a;
    const other = allPersons.find((p) => p.id === otherId);
    const name = other?.display_name ?? "Unknown";

    if (parentTypes.has(rel.type)) {
      if (isA) {
        // person_a is parent, person_b is child → this person IS the parent
        children.push({ id: otherId, name, type: rel.type });
      } else {
        // person_b is child → this person IS the child, other is parent
        parents.push({ id: otherId, name, type: rel.type });
      }
    }
  }

  // Sort children and parents alphabetically
  parents.sort((a, b) => a.name.localeCompare(b.name));
  children.sort((a, b) => a.name.localeCompare(b.name));

  return { parents, children };
}

export default function PersonDetail({
  graphId,
  person,
  allPersons,
  relationships,
  stories,
  isEditor,
  canAddStories: canContribute,
  currentUserId,
}: PersonDetailProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [formData, setFormData] = useState({
    display_name: person.display_name,
    given_name: person.given_name ?? "",
    nickname: person.nickname ?? "",
    preferred_name: person.preferred_name ?? "",
    pronouns: person.pronouns ?? "",
    birth_date: person.birth_date ?? "",
    death_date: person.death_date ?? "",
    birth_location: person.birth_location ?? "",
    notes: person.notes ?? "",
    is_incomplete: person.is_incomplete,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = groupRelationships(person.id, relationships, allPersons);
  const unions = resolveUnions(person.id, relationships, allPersons);

  function handleEdit() {
    setFormData({
      display_name: person.display_name,
      given_name: person.given_name ?? "",
      nickname: person.nickname ?? "",
      preferred_name: person.preferred_name ?? "",
      pronouns: person.pronouns ?? "",
      birth_date: person.birth_date ?? "",
      death_date: person.death_date ?? "",
      birth_location: person.birth_location ?? "",
      notes: person.notes ?? "",
      is_incomplete: person.is_incomplete,
    });
    setError(null);
    setMode("edit");
  }

  function handleCancel() {
    setError(null);
    setMode("view");
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("display_name", formData.display_name);
      fd.set("given_name", formData.given_name);
      fd.set("nickname", formData.nickname);
      fd.set("preferred_name", formData.preferred_name);
      fd.set("pronouns", formData.pronouns);
      fd.set("birth_date", formData.birth_date);
      fd.set("death_date", formData.death_date);
      fd.set("birth_location", formData.birth_location);
      fd.set("notes", formData.notes);
      fd.set("is_incomplete", formData.is_incomplete ? "true" : "false");

      await updatePerson(graphId, person.id, fd);
      setMode("view");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // ── View Mode ──────────────────────────────────────────

  if (mode === "view") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">{person.display_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {person.preferred_name && (
                <span className="text-sm text-[#7fdb9a]/70">
                  Goes by &ldquo;{person.preferred_name}&rdquo;
                </span>
              )}
              {person.nickname && !person.preferred_name && (
                <span className="text-sm text-white/50">
                  &ldquo;{person.nickname}&rdquo;
                </span>
              )}
              {person.nickname && person.preferred_name && (
                <span className="text-sm text-white/40">
                  aka &ldquo;{person.nickname}&rdquo;
                </span>
              )}
              {person.pronouns && (
                <span className="text-sm text-white/50">
                  {person.pronouns}
                </span>
              )}
              {person.is_incomplete && (
                <span className="rounded-full bg-yellow-500/10 px-3 py-0.5 text-xs font-medium text-yellow-400">
                  Incomplete
                </span>
              )}
            </div>
          </div>
          {isEditor && (
            <button
              onClick={handleEdit}
              className="rounded-xl border border-white/20 px-5 py-2 text-sm font-semibold transition hover:bg-white/5"
            >
              Edit
            </button>
          )}
        </div>

        {/* Dates & Location */}
        {(person.birth_date ||
          person.death_date ||
          person.birth_location) && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {person.birth_date && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                    Born
                  </span>
                  <p className="mt-1 text-white/80">
                    {formatDateForDisplay(person.birth_date)}
                  </p>
                </div>
              )}
              {person.death_date && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                    Died
                  </span>
                  <p className="mt-1 text-white/80">
                    {formatDateForDisplay(person.death_date)}
                  </p>
                </div>
              )}
              {person.birth_location && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                    Birth Location
                  </span>
                  <p className="mt-1 text-white/80">
                    {person.birth_location}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {person.notes && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              Notes
            </h2>
            <p className="whitespace-pre-wrap text-white/70">
              {person.notes}
            </p>
          </div>
        )}

        {/* Unions (Marriages / Partnerships) */}
        {unions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wider text-white/40">
              Unions
            </h2>
            {unions.map((union) => (
              <UnionCard
                key={union.relationshipId}
                union={union}
                graphId={graphId}
              />
            ))}
          </div>
        )}

        {/* Relationships (Parents & Children) */}
        {(grouped.parents.length > 0 ||
          grouped.children.length > 0) && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-white/40">
              Family
            </h2>
            <div className="space-y-4">
              {grouped.parents.length > 0 && (
                <RelationshipGroup
                  label="Parents"
                  items={grouped.parents}
                  graphId={graphId}
                />
              )}
              {grouped.children.length > 0 && (
                <RelationshipGroup
                  label="Children"
                  items={grouped.children}
                  graphId={graphId}
                />
              )}
            </div>
          </div>
        )}

        {/* Stories */}
        <StorySection
          graphId={graphId}
          personId={person.id}
          personName={person.display_name}
          stories={stories}
          currentUserId={currentUserId}
          canAddStories={canContribute}
        />

        {/* Empty state (no details besides stories section) */}
        {!person.birth_date &&
          !person.death_date &&
          !person.birth_location &&
          !person.notes &&
          grouped.parents.length === 0 &&
          unions.length === 0 &&
          grouped.children.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/20 p-12 text-center">
              <p className="text-white/40">
                No details recorded yet.
                {isEditor && " Click Edit to add information."}
              </p>
            </div>
          )}
      </div>
    );
  }

  // ── Edit Mode ──────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Edit Person</h1>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="rounded-xl border border-white/20 px-5 py-2 text-sm font-semibold transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-5 py-2 text-sm font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
        {/* Display Name */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
            Display Name *
          </label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) =>
              setFormData({ ...formData, display_name: e.target.value })
            }
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
            required
          />
          <p className="mt-1 text-xs text-white/30">
            Full name as shown in lists and cards
          </p>
        </div>

        {/* Given Name, Nickname, Preferred Name */}
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Given Name
            </label>
            <input
              type="text"
              value={formData.given_name}
              onChange={(e) =>
                setFormData({ ...formData, given_name: e.target.value })
              }
              placeholder="e.g. Margaret"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Nickname
            </label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) =>
                setFormData({ ...formData, nickname: e.target.value })
              }
              placeholder="e.g. Peggy"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Preferred Name
            </label>
            <input
              type="text"
              value={formData.preferred_name}
              onChange={(e) =>
                setFormData({ ...formData, preferred_name: e.target.value })
              }
              placeholder="e.g. Peg"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
            />
          </div>
        </div>

        {/* Pronouns */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
            Pronouns
          </label>
          <input
            type="text"
            value={formData.pronouns}
            onChange={(e) =>
              setFormData({ ...formData, pronouns: e.target.value })
            }
            placeholder="e.g. she/her, he/him, they/them"
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
          />
        </div>

        {/* Birth Date & Death Date */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Birth Date
            </label>
            <input
              type="text"
              value={formData.birth_date}
              onChange={(e) =>
                setFormData({ ...formData, birth_date: e.target.value })
              }
              placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Death Date
            </label>
            <input
              type="text"
              value={formData.death_date}
              onChange={(e) =>
                setFormData({ ...formData, death_date: e.target.value })
              }
              placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
            />
          </div>
        </div>

        {/* Birth Location */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
            Birth Location
          </label>
          <input
            type="text"
            value={formData.birth_location}
            onChange={(e) =>
              setFormData({ ...formData, birth_location: e.target.value })
            }
            placeholder="e.g. Dublin, Ireland"
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={4}
            placeholder="Additional notes about this person..."
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
          />
        </div>

        {/* Incomplete flag */}
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={formData.is_incomplete}
            onChange={(e) =>
              setFormData({ ...formData, is_incomplete: e.target.checked })
            }
            className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#7fdb9a] focus:ring-[#7fdb9a]"
          />
          <span className="text-sm text-white/60">
            Mark as incomplete (needs more information)
          </span>
        </label>
      </div>

      {/* Relationships (read-only in edit mode) */}
      {(grouped.parents.length > 0 ||
        unions.length > 0 ||
        grouped.children.length > 0) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 opacity-60">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-white/40">
            Relationships (view only)
          </h2>
          <div className="space-y-4">
            {grouped.parents.length > 0 && (
              <RelationshipGroup
                label="Parents"
                items={grouped.parents}
                graphId={graphId}
              />
            )}
            {unions.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-white/60">Unions</h3>
                <div className="space-y-1">
                  {unions.map((u) => (
                    <div key={u.relationshipId} className="flex items-center gap-2 text-sm">
                      <span className="text-xs">{u.icon}</span>
                      <Link
                        href={`/graph/${graphId}/person/${u.partner.id}`}
                        className="text-white/80 transition hover:text-[#7fdb9a]"
                      >
                        {u.partner.display_name}
                      </Link>
                      <span className="text-xs text-white/30">{u.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {grouped.children.length > 0 && (
              <RelationshipGroup
                label="Children"
                items={grouped.children}
                graphId={graphId}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────

function UnionCard({
  union,
  graphId,
}: {
  union: Union;
  graphId: string;
}) {
  const dateRange = formatUnionDateRange(union.startDate, union.endDate);

  // Color variations by union type
  const borderColor =
    union.type === "divorced"
      ? "border-red-500/20"
      : union.type === "partners"
        ? "border-blue-400/20"
        : "border-[#7fdb9a]/20";

  return (
    <div
      className={`rounded-2xl border ${borderColor} bg-white/5 p-5 transition hover:bg-white/[0.07]`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{union.icon}</span>
          <span className="text-sm font-semibold text-white/70">
            {union.label}
          </span>
          {dateRange && (
            <span className="text-xs text-white/40">{dateRange}</span>
          )}
        </div>
      </div>
      <div className="mt-2">
        <Link
          href={`/graph/${graphId}/person/${union.partner.id}`}
          className="text-lg font-medium text-white/90 transition hover:text-[#7fdb9a]"
        >
          {union.partner.display_name}
        </Link>
        {union.partner.birth_date && (
          <span className="ml-2 text-sm text-white/40">
            {formatDateForDisplay(union.partner.birth_date)}
          </span>
        )}
      </div>
    </div>
  );
}

function RelationshipGroup({
  label,
  items,
  graphId,
}: {
  label: string;
  items: { id: string; name: string; type: string }[];
  graphId: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-white/60">{label}</h3>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-sm">
            <Link
              href={`/graph/${graphId}/person/${item.id}`}
              className="text-white/80 transition hover:text-[#7fdb9a]"
            >
              {item.name}
            </Link>
            <span className="text-xs text-white/30">
              {RELATIONSHIP_TYPE_LABELS[item.type] ?? item.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
