"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Person, Relationship, RelationshipType, StoryWithAuthor } from "@/types/database";
import { formatDateForDisplay, validateDateInput } from "@/lib/date-utils";
import { resolveUnions, formatUnionDateRange } from "@/lib/union-utils";
import type { Union } from "@/lib/union-utils";
import { updatePerson, createRelationship, deleteRelationship, restoreRelationship } from "./actions";
import { useUndo } from "@/lib/undo";
import StorySection from "./story-section";

const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  biological_parent: "Biological",
  adoptive_parent: "Adoptive",
  step_parent: "Step",
  spouse: "Spouse",
  ex_spouse: "Ex-spouse",
  partner: "Partner",
};

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: "biological_parent", label: "Parent (biological)" },
  { value: "adoptive_parent", label: "Parent (adoptive)" },
  { value: "step_parent", label: "Step-parent" },
  { value: "spouse", label: "Spouse" },
  { value: "ex_spouse", label: "Ex-spouse" },
  { value: "partner", label: "Partner" },
];

const PARENT_TYPES = new Set<string>([
  "biological_parent",
  "adoptive_parent",
  "step_parent",
]);

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
  parents: { id: string; relationshipId: string; name: string; type: string }[];
  children: { id: string; relationshipId: string; name: string; type: string }[];
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
        children.push({ id: otherId, relationshipId: rel.id, name, type: rel.type });
      } else {
        // person_b is child → this person IS the child, other is parent
        parents.push({ id: otherId, relationshipId: rel.id, name, type: rel.type });
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
  const [dateErrors, setDateErrors] = useState<{
    birth_date: string | null;
    death_date: string | null;
  }>({ birth_date: null, death_date: null });

  // Remove relationship state
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Add relationship form state
  const [showAddRelForm, setShowAddRelForm] = useState(false);
  const [addRelType, setAddRelType] = useState<RelationshipType>("biological_parent");
  const [addRelDirection, setAddRelDirection] = useState<"current_is_a" | "current_is_b">("current_is_a");
  const [addRelTargetId, setAddRelTargetId] = useState<string | null>(null);
  const [addRelSaving, setAddRelSaving] = useState(false);
  const [addRelError, setAddRelError] = useState<string | null>(null);

  const { pushAction } = useUndo();
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
    setDateErrors({ birth_date: null, death_date: null });
    setMode("edit");
  }

  function handleCancel() {
    setError(null);
    setDateErrors({ birth_date: null, death_date: null });
    setMode("view");
  }

  const hasDateErrors = dateErrors.birth_date !== null || dateErrors.death_date !== null;

  async function handleSave() {
    // Validate dates before submitting
    const birthErr = validateDateInput(formData.birth_date);
    const deathErr = validateDateInput(formData.death_date);
    if (birthErr || deathErr) {
      setDateErrors({ birth_date: birthErr, death_date: deathErr });
      return;
    }

    // Snapshot "before" state for undo
    const beforeData = {
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
    };
    const afterData = { ...formData };

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

      // Push undo action
      pushAction({
        description: `Updated ${formData.display_name}`,
        undo: async () => {
          const undoFd = new FormData();
          Object.entries(beforeData).forEach(([key, val]) => {
            undoFd.set(key, typeof val === "boolean" ? (val ? "true" : "false") : val);
          });
          await updatePerson(graphId, person.id, undoFd);
          router.refresh();
        },
        redo: async () => {
          const redoFd = new FormData();
          Object.entries(afterData).forEach(([key, val]) => {
            redoFd.set(key, typeof val === "boolean" ? (val ? "true" : "false") : val);
          });
          await updatePerson(graphId, person.id, redoFd);
          router.refresh();
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveRelationship(relationshipId: string) {
    // Snapshot the relationship before deleting for undo
    const rel = relationships.find((r) => r.id === relationshipId);
    const relSnapshot = rel
      ? {
          person_a: rel.person_a,
          person_b: rel.person_b,
          type: rel.type,
          start_date: rel.start_date,
          end_date: rel.end_date,
        }
      : null;
    const otherPerson = rel
      ? allPersons.find(
          (p) =>
            p.id === (rel.person_a === person.id ? rel.person_b : rel.person_a),
        )
      : null;

    setRemoving(true);
    setRemoveError(null);
    try {
      await deleteRelationship(graphId, person.id, relationshipId);
      setConfirmingRemoveId(null);
      router.refresh();

      // Push undo action if we captured the snapshot
      if (relSnapshot) {
        let restoredId = relationshipId;
        pushAction({
          description: `Removed relationship with ${otherPerson?.display_name ?? "unknown"}`,
          undo: async () => {
            restoredId = await restoreRelationship(graphId, relSnapshot);
            router.refresh();
          },
          redo: async () => {
            await deleteRelationship(graphId, person.id, restoredId);
            router.refresh();
          },
        });
      }
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : "Failed to remove");
    } finally {
      setRemoving(false);
    }
  }

  async function handleAddRelationship() {
    if (!addRelTargetId) return;
    const targetId = addRelTargetId;
    const type = addRelType;
    const direction = PARENT_TYPES.has(addRelType) ? addRelDirection : "current_is_a";
    const targetPerson = allPersons.find((p) => p.id === targetId);

    setAddRelSaving(true);
    setAddRelError(null);
    try {
      const fd = new FormData();
      fd.set("type", type);
      fd.set("target_person_id", targetId);
      fd.set("direction", direction);
      const newId = await createRelationship(graphId, person.id, fd);
      setShowAddRelForm(false);
      setAddRelType("biological_parent");
      setAddRelDirection("current_is_a");
      setAddRelTargetId(null);
      setAddRelError(null);
      router.refresh();

      // Push undo action
      let currentId = newId;
      pushAction({
        description: `Added relationship with ${targetPerson?.display_name ?? "unknown"}`,
        undo: async () => {
          await deleteRelationship(graphId, person.id, currentId);
          router.refresh();
        },
        redo: async () => {
          const redoFd = new FormData();
          redoFd.set("type", type);
          redoFd.set("target_person_id", targetId);
          redoFd.set("direction", direction);
          currentId = await createRelationship(graphId, person.id, redoFd);
          router.refresh();
        },
      });
    } catch (e) {
      setAddRelError(e instanceof Error ? e.message : "Failed to add relationship");
    } finally {
      setAddRelSaving(false);
    }
  }

  const otherPersons = allPersons
    .filter((p) => p.id !== person.id)
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

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
                isEditor={isEditor}
                confirmingRemoveId={confirmingRemoveId}
                removing={removing}
                onRemoveClick={setConfirmingRemoveId}
                onConfirmRemove={handleRemoveRelationship}
                onCancelRemove={() => setConfirmingRemoveId(null)}
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
                  isEditor={isEditor}
                  confirmingRemoveId={confirmingRemoveId}
                  removing={removing}
                  onRemoveClick={setConfirmingRemoveId}
                  onConfirmRemove={handleRemoveRelationship}
                  onCancelRemove={() => setConfirmingRemoveId(null)}
                />
              )}
              {grouped.children.length > 0 && (
                <RelationshipGroup
                  label="Children"
                  items={grouped.children}
                  graphId={graphId}
                  isEditor={isEditor}
                  confirmingRemoveId={confirmingRemoveId}
                  removing={removing}
                  onRemoveClick={setConfirmingRemoveId}
                  onConfirmRemove={handleRemoveRelationship}
                  onCancelRemove={() => setConfirmingRemoveId(null)}
                />
              )}
            </div>
          </div>
        )}

        {/* Remove error */}
        {removeError && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {removeError}
          </div>
        )}

        {/* Add Relationship */}
        {isEditor && (
          <div>
            {!showAddRelForm ? (
              <button
                onClick={() => {
                  setShowAddRelForm(true);
                  setAddRelError(null);
                }}
                className="text-sm font-medium text-[#7fdb9a] transition hover:text-[#7fdb9a]/80"
              >
                + Add Relationship
              </button>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-white/40">
                  Add Relationship
                </h2>
                <div className="space-y-4">
                  {/* Relationship type */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/50">
                      Relationship type
                    </label>
                    <select
                      value={addRelType}
                      onChange={(e) => {
                        setAddRelType(e.target.value as RelationshipType);
                        setAddRelDirection("current_is_a");
                      }}
                      className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-[#7fdb9a] focus:outline-none"
                    >
                      {RELATIONSHIP_TYPES.map((rt) => (
                        <option key={rt.value} value={rt.value}>
                          {rt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Direction (parent types only) */}
                  {PARENT_TYPES.has(addRelType) && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white/50">
                        Direction
                      </label>
                      <div className="space-y-2">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name="rel-direction"
                            checked={addRelDirection === "current_is_a"}
                            onChange={() => setAddRelDirection("current_is_a")}
                            className="h-4 w-4 border-white/20 bg-white/5 text-[#7fdb9a] focus:ring-[#7fdb9a]"
                          />
                          <span className="text-sm text-white/70">
                            {person.display_name} is the <strong>parent</strong>
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name="rel-direction"
                            checked={addRelDirection === "current_is_b"}
                            onChange={() => setAddRelDirection("current_is_b")}
                            className="h-4 w-4 border-white/20 bg-white/5 text-[#7fdb9a] focus:ring-[#7fdb9a]"
                          />
                          <span className="text-sm text-white/70">
                            {person.display_name} is the <strong>child</strong>
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Person selector */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/50">
                      Person
                    </label>
                    <PersonSearchCombobox
                      persons={otherPersons}
                      selectedPersonId={addRelTargetId}
                      onSelect={setAddRelTargetId}
                    />
                  </div>

                  {/* Error */}
                  {addRelError && (
                    <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
                      {addRelError}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddRelationship}
                      disabled={addRelSaving || !addRelTargetId}
                      className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-5 py-2 text-sm font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
                    >
                      {addRelSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddRelForm(false);
                        setAddRelType("biological_parent");
                        setAddRelDirection("current_is_a");
                        setAddRelTargetId(null);
                        setAddRelError(null);
                      }}
                      disabled={addRelSaving}
                      className="rounded-xl border border-white/20 px-5 py-2 text-sm font-semibold transition hover:bg-white/5 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
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
            disabled={saving || hasDateErrors}
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
              onChange={(e) => {
                setFormData({ ...formData, birth_date: e.target.value });
                // Clear error on change if field becomes valid or empty
                if (dateErrors.birth_date) {
                  const err = validateDateInput(e.target.value);
                  if (!err) setDateErrors((prev) => ({ ...prev, birth_date: null }));
                }
              }}
              onBlur={() => {
                const err = validateDateInput(formData.birth_date);
                setDateErrors((prev) => ({ ...prev, birth_date: err }));
              }}
              placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
              className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none ${
                dateErrors.birth_date
                  ? "border-red-400 focus:border-red-400"
                  : "border-white/20 focus:border-[#7fdb9a]"
              }`}
            />
            {dateErrors.birth_date && (
              <p className="mt-1 text-xs text-red-400">
                {dateErrors.birth_date}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Death Date
            </label>
            <input
              type="text"
              value={formData.death_date}
              onChange={(e) => {
                setFormData({ ...formData, death_date: e.target.value });
                if (dateErrors.death_date) {
                  const err = validateDateInput(e.target.value);
                  if (!err) setDateErrors((prev) => ({ ...prev, death_date: null }));
                }
              }}
              onBlur={() => {
                const err = validateDateInput(formData.death_date);
                setDateErrors((prev) => ({ ...prev, death_date: err }));
              }}
              placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
              className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none ${
                dateErrors.death_date
                  ? "border-red-400 focus:border-red-400"
                  : "border-white/20 focus:border-[#7fdb9a]"
              }`}
            />
            {dateErrors.death_date && (
              <p className="mt-1 text-xs text-red-400">
                {dateErrors.death_date}
              </p>
            )}
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
  isEditor,
  confirmingRemoveId,
  removing,
  onRemoveClick,
  onConfirmRemove,
  onCancelRemove,
}: {
  union: Union;
  graphId: string;
  isEditor?: boolean;
  confirmingRemoveId?: string | null;
  removing?: boolean;
  onRemoveClick?: (id: string) => void;
  onConfirmRemove?: (id: string) => void;
  onCancelRemove?: () => void;
}) {
  const dateRange = formatUnionDateRange(union.startDate, union.endDate);

  // Color variations by union type
  const borderColor =
    union.type === "divorced"
      ? "border-red-500/20"
      : union.type === "partners"
        ? "border-blue-400/20"
        : "border-[#7fdb9a]/20";

  const isConfirming = confirmingRemoveId === union.relationshipId;

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
        {isEditor && onRemoveClick && onConfirmRemove && onCancelRemove && (
          <div className="shrink-0">
            {isConfirming ? (
              <span className="flex items-center gap-2 text-xs">
                <span className="text-white/40">Remove?</span>
                <button
                  onClick={() => onConfirmRemove(union.relationshipId)}
                  disabled={removing}
                  className="font-medium text-red-400 transition hover:text-red-300 disabled:opacity-50"
                >
                  {removing ? "..." : "Yes"}
                </button>
                <button
                  onClick={onCancelRemove}
                  disabled={removing}
                  className="text-white/40 transition hover:text-white/60"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                onClick={() => onRemoveClick(union.relationshipId)}
                className="text-xs text-red-400/60 transition hover:text-red-400"
              >
                Remove
              </button>
            )}
          </div>
        )}
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
  isEditor,
  confirmingRemoveId,
  removing,
  onRemoveClick,
  onConfirmRemove,
  onCancelRemove,
}: {
  label: string;
  items: { id: string; relationshipId: string; name: string; type: string }[];
  graphId: string;
  isEditor?: boolean;
  confirmingRemoveId?: string | null;
  removing?: boolean;
  onRemoveClick?: (id: string) => void;
  onConfirmRemove?: (id: string) => void;
  onCancelRemove?: () => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-white/60">{label}</h3>
      <div className="space-y-1">
        {items.map((item) => {
          const isConfirming = confirmingRemoveId === item.relationshipId;
          return (
            <div key={item.relationshipId} className="flex items-center gap-2 text-sm">
              <Link
                href={`/graph/${graphId}/person/${item.id}`}
                className="text-white/80 transition hover:text-[#7fdb9a]"
              >
                {item.name}
              </Link>
              <span className="text-xs text-white/30">
                {RELATIONSHIP_TYPE_LABELS[item.type] ?? item.type}
              </span>
              {isEditor && onRemoveClick && onConfirmRemove && onCancelRemove && (
                <>
                  {isConfirming ? (
                    <span className="flex items-center gap-2 text-xs">
                      <span className="text-white/40">Remove?</span>
                      <button
                        onClick={() => onConfirmRemove(item.relationshipId)}
                        disabled={removing}
                        className="font-medium text-red-400 transition hover:text-red-300 disabled:opacity-50"
                      >
                        {removing ? "..." : "Yes"}
                      </button>
                      <button
                        onClick={onCancelRemove}
                        disabled={removing}
                        className="text-white/40 transition hover:text-white/60"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => onRemoveClick(item.relationshipId)}
                      className="text-xs text-red-400/60 transition hover:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PersonSearchCombobox({
  persons,
  selectedPersonId,
  onSelect,
}: {
  persons: Person[];
  selectedPersonId: string | null;
  onSelect: (personId: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPerson = selectedPersonId
    ? persons.find((p) => p.id === selectedPersonId)
    : null;

  const filtered = search.trim()
    ? persons
        .filter((p) =>
          p.display_name.toLowerCase().includes(search.toLowerCase()),
        )
        .slice(0, 10)
    : persons.slice(0, 10);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  function handleBlur() {
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  }

  function handleFocus() {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (!selectedPerson) setIsOpen(true);
  }

  function handleSelect(personId: string) {
    onSelect(personId);
    setSearch("");
    setIsOpen(false);
  }

  function handleClear() {
    onSelect(null);
    setSearch("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  if (selectedPerson) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5">
        <span className="text-sm text-white">{selectedPerson.display_name}</span>
        <button
          type="button"
          onClick={handleClear}
          className="ml-auto text-xs text-white/40 transition hover:text-white/70"
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search for a person..."
        className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
      />
      {isOpen && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-white/20 bg-[#0f1a14] shadow-lg"
        >
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(p.id)}
              className="block w-full px-4 py-2 text-left text-sm text-white/80 transition hover:bg-white/10"
            >
              {p.display_name}
              {p.birth_date && (
                <span className="ml-2 text-xs text-white/30">
                  {p.birth_date}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {isOpen && search.trim() && filtered.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border border-white/20 bg-[#0f1a14] px-4 py-3 text-sm text-white/40 shadow-lg">
          No matches found
        </div>
      )}
    </div>
  );
}
