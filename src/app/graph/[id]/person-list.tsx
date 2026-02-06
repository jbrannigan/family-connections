"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Person, Relationship, RelationshipType } from "@/types/database";

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  biological_parent: "Parent (biological)",
  adoptive_parent: "Parent (adoptive)",
  step_parent: "Step-parent",
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

function getDirectionalLabel(
  type: RelationshipType,
  isPersonA: boolean,
): string {
  switch (type) {
    case "biological_parent":
      return isPersonA ? "Parent of" : "Child of";
    case "adoptive_parent":
      return isPersonA ? "Adoptive parent of" : "Adopted by";
    case "step_parent":
      return isPersonA ? "Step-parent of" : "Step-child of";
    case "spouse":
      return "Spouse of";
    case "ex_spouse":
      return "Ex-spouse of";
    case "partner":
      return "Partner of";
  }
}

export default function PersonList({
  graphId,
  initialPersons,
  initialRelationships,
  isAdmin,
}: {
  graphId: string;
  initialPersons: Person[];
  initialRelationships: Relationship[];
  isAdmin: boolean;
}) {
  const [persons, setPersons] = useState<Person[]>(initialPersons);
  const [relationships, setRelationships] =
    useState<Relationship[]>(initialRelationships);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPronouns, setNewPronouns] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Relationship form state
  const [addingRelFor, setAddingRelFor] = useState<string | null>(null);
  const [relOtherId, setRelOtherId] = useState("");
  const [relType, setRelType] = useState<RelationshipType>("biological_parent");
  const [relLoading, setRelLoading] = useState(false);
  const [relError, setRelError] = useState<string | null>(null);

  const router = useRouter();

  async function handleAddPerson(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error: insertError } = await supabase
      .from("persons")
      .insert({
        graph_id: graphId,
        display_name: newName,
        pronouns: newPronouns || null,
        created_by: user.id,
      })
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data) {
      setPersons((prev) =>
        [...prev, data as Person].sort((a, b) =>
          a.display_name.localeCompare(b.display_name),
        ),
      );
      setNewName("");
      setNewPronouns("");
      setShowAddForm(false);
      router.refresh();
    }
  }

  async function handleAddRelationship(e: React.FormEvent) {
    e.preventDefault();
    if (!addingRelFor || !relOtherId) return;

    setRelLoading(true);
    setRelError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error: insertError } = await supabase
      .from("relationships")
      .insert({
        graph_id: graphId,
        person_a: addingRelFor,
        person_b: relOtherId,
        type: relType,
        created_by: user.id,
      })
      .select()
      .single();

    setRelLoading(false);

    if (insertError) {
      setRelError(insertError.message);
      return;
    }

    if (data) {
      setRelationships((prev) => [...prev, data as Relationship]);
      setAddingRelFor(null);
      setRelOtherId("");
      setRelType("biological_parent");
      setRelError(null);
      router.refresh();
    }
  }

  function getRelationshipsFor(personId: string) {
    return relationships
      .filter((r) => r.person_a === personId || r.person_b === personId)
      .map((r) => {
        const isA = r.person_a === personId;
        const otherId = isA ? r.person_b : r.person_a;
        const other = persons.find((p) => p.id === otherId);
        return {
          type: r.type as RelationshipType,
          otherId,
          otherName: other?.display_name ?? "Unknown",
          isA,
        };
      });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Family Members ({persons.length})
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-5 py-2 text-sm font-semibold text-[#0f1a14] transition hover:opacity-90"
        >
          {showAddForm ? "Cancel" : "+ Add Person"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddPerson}
          className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          <h3 className="mb-4 text-lg font-semibold">Add Family Member</h3>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <label
                htmlFor="person-name"
                className="mb-1 block text-sm text-white/60"
              >
                Name
              </label>
              <input
                id="person-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
                required
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
              />
            </div>
            <div className="w-40">
              <label
                htmlFor="person-pronouns"
                className="mb-1 block text-sm text-white/60"
              >
                Pronouns
              </label>
              <input
                id="person-pronouns"
                type="text"
                value={newPronouns}
                onChange={(e) => setNewPronouns(e.target.value)}
                placeholder="e.g. she/her"
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-[#7fdb9a] px-6 py-2.5 text-sm font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </form>
      )}

      {persons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 p-12 text-center">
          <div className="mb-3 text-4xl">👨‍👩‍👧‍👦</div>
          <h3 className="mb-1 text-lg font-semibold">No family members yet</h3>
          <p className="text-sm text-white/50">
            Click &quot;+ Add Person&quot; to start building your family graph.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {persons.map((person) => {
            const rels = getRelationshipsFor(person.id);
            const isAddingRel = addingRelFor === person.id;
            const otherPersons = persons.filter((p) => p.id !== person.id);

            return (
              <div
                key={person.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-[#7fdb9a]/20"
              >
                <div className="mb-1 flex items-start justify-between">
                  <Link
                    href={`/graph/${graphId}/person/${person.id}`}
                    className="text-lg font-semibold transition hover:text-[#7fdb9a]"
                  >
                    {person.display_name}
                  </Link>
                  {person.is_incomplete && (
                    <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">
                      incomplete
                    </span>
                  )}
                </div>
                {person.pronouns && (
                  <p className="mb-2 text-sm text-white/40">
                    {person.pronouns}
                  </p>
                )}
                {person.birth_date && (
                  <p className="text-sm text-white/40">
                    Born: {person.birth_date}
                  </p>
                )}

                {/* Relationships */}
                {rels.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-white/10 pt-3">
                    {rels.map((rel, i) => (
                      <p key={i} className="text-xs text-white/50">
                        <span className="text-[#7fdb9a]">
                          {getDirectionalLabel(rel.type, rel.isA)}
                        </span>{" "}
                        <Link
                          href={`/graph/${graphId}/person/${rel.otherId}`}
                          className="transition hover:text-white/80"
                        >
                          {rel.otherName}
                        </Link>
                      </p>
                    ))}
                  </div>
                )}

                {/* Add Relationship */}
                {isAdmin && !isAddingRel && otherPersons.length > 0 && (
                  <button
                    onClick={() => {
                      setAddingRelFor(person.id);
                      setRelOtherId(otherPersons[0].id);
                      setRelType("biological_parent");
                      setRelError(null);
                    }}
                    className="mt-3 text-xs text-white/30 transition hover:text-[#7fdb9a]"
                  >
                    + Add relationship
                  </button>
                )}

                {isAddingRel && (
                  <form
                    onSubmit={handleAddRelationship}
                    className="mt-3 space-y-3 border-t border-white/10 pt-3"
                  >
                    <div>
                      <label className="mb-1 block text-xs text-white/50">
                        Relationship
                      </label>
                      <select
                        value={relType}
                        onChange={(e) =>
                          setRelType(e.target.value as RelationshipType)
                        }
                        className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-[#7fdb9a] focus:outline-none"
                      >
                        {RELATIONSHIP_TYPES.map((rt) => (
                          <option key={rt.value} value={rt.value}>
                            {rt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-white/50">
                        Of
                      </label>
                      <select
                        value={relOtherId}
                        onChange={(e) => setRelOtherId(e.target.value)}
                        className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-[#7fdb9a] focus:outline-none"
                      >
                        {otherPersons.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.display_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {relError && (
                      <p className="text-xs text-red-400">{relError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={relLoading}
                        className="rounded-lg bg-[#7fdb9a] px-4 py-1.5 text-xs font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
                      >
                        {relLoading ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingRelFor(null);
                          setRelError(null);
                        }}
                        className="rounded-lg border border-white/20 px-4 py-1.5 text-xs transition hover:bg-white/5"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isAdmin && persons.length > 0 && (
        <p className="mt-4 text-center text-sm text-white/30">
          Contact an admin to edit or remove family members.
        </p>
      )}
    </div>
  );
}
