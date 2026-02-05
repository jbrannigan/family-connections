"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  importTreeDown,
  type TreeDownImportResult,
} from "@/lib/import-treedown";

type ImportStep = "input" | "preview" | "importing" | "done";

export default function ImportForm({ graphId }: { graphId: string }) {
  const [text, setText] = useState("");
  const [step, setStep] = useState<ImportStep>("input");
  const [preview, setPreview] = useState<TreeDownImportResult | null>(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState({
    persons: 0,
    relationships: 0,
  });
  const router = useRouter();

  function handlePreview() {
    setError(null);
    const result = importTreeDown(text);

    if (result.warnings.length > 0 && result.persons.length === 0) {
      setError(result.warnings.join(", "));
      return;
    }

    setPreview(result);
    setStep("preview");
  }

  async function handleImport() {
    if (!preview) return;

    setStep("importing");
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setStep("preview");
      return;
    }

    try {
      // Step 1: Insert all persons
      setProgress(
        `Inserting ${preview.persons.length} people...`,
      );

      const tempIdToRealId = new Map<string, string>();

      // Insert persons one at a time to get their real IDs
      for (let i = 0; i < preview.persons.length; i++) {
        const person = preview.persons[i];
        setProgress(
          `Adding person ${i + 1}/${preview.persons.length}: ${person.displayName}`,
        );

        const { data, error: insertError } = await supabase
          .from("persons")
          .insert({
            graph_id: graphId,
            display_name: person.displayName,
            birth_date: person.birthDate,
            death_date: person.deathDate,
            created_by: user.id,
          })
          .select("id")
          .single();

        if (insertError) {
          throw new Error(
            `Failed to add ${person.displayName}: ${insertError.message}`,
          );
        }

        tempIdToRealId.set(person.tempId, data.id);
      }

      // Step 2: Insert all relationships
      setProgress(
        `Creating ${preview.relationships.length} relationships...`,
      );

      let relCount = 0;
      for (const rel of preview.relationships) {
        const personA = tempIdToRealId.get(rel.parentTempId);
        const personB = tempIdToRealId.get(rel.childTempId);

        if (!personA || !personB) {
          continue; // Skip if we couldn't map the temp IDs
        }

        relCount++;
        setProgress(
          `Creating relationship ${relCount}/${preview.relationships.length}...`,
        );

        const { error: relError } = await supabase
          .from("relationships")
          .insert({
            graph_id: graphId,
            person_a: personA,
            person_b: personB,
            type: rel.type,
            created_by: user.id,
          });

        if (relError) {
          // Duplicate relationship is okay, skip it
          if (!relError.message.includes("duplicate")) {
            throw new Error(
              `Failed to create relationship: ${relError.message}`,
            );
          }
        }
      }

      setImportedCount({
        persons: preview.persons.length,
        relationships: relCount,
      });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setStep("preview");
    }
  }

  if (step === "done") {
    return (
      <div className="rounded-2xl border border-[#7fdb9a]/20 bg-[#7fdb9a]/5 p-8 text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h2 className="mb-2 text-2xl font-bold">Import Complete</h2>
        <p className="mb-6 text-white/60">
          Added {importedCount.persons} people and{" "}
          {importedCount.relationships} relationships.
        </p>
        <button
          onClick={() => router.push(`/graph/${graphId}`)}
          className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-8 py-3 font-semibold text-[#0f1a14] transition hover:opacity-90"
        >
          View Family Graph
        </button>
      </div>
    );
  }

  if (step === "importing") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="mb-4 text-4xl animate-pulse">⏳</div>
        <h2 className="mb-2 text-xl font-semibold">Importing...</h2>
        <p className="text-sm text-white/50">{progress}</p>
      </div>
    );
  }

  if (step === "preview" && preview) {
    return (
      <div>
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-xl font-semibold">Preview</h2>

          {preview.warnings.length > 0 && (
            <div className="mb-4 rounded-lg bg-yellow-500/10 p-3">
              {preview.warnings.map((w, i) => (
                <p key={i} className="text-sm text-yellow-400">
                  ⚠️ {w}
                </p>
              ))}
            </div>
          )}

          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-white/60">
              People ({preview.persons.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {preview.persons.map((p) => {
                const dateStr = p.birthDate
                  ? p.deathDate
                    ? `(${p.birthDate}-${p.deathDate})`
                    : `(b. ${p.birthDate})`
                  : "";
                return (
                  <span
                    key={p.tempId}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-sm"
                  >
                    {p.displayName}
                    {dateStr && (
                      <span className="ml-1 text-[#7fdb9a]/70">{dateStr}</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-white/60">
              Relationships ({preview.relationships.length})
            </h3>
            <div className="space-y-1">
              {preview.relationships.map((r, i) => {
                const parentName =
                  preview.persons.find((p) => p.tempId === r.parentTempId)
                    ?.displayName ?? "?";
                const childName =
                  preview.persons.find((p) => p.tempId === r.childTempId)
                    ?.displayName ?? "?";
                const typeLabel =
                  r.type === "spouse"
                    ? "married to"
                    : r.type === "ex_spouse"
                      ? "ex-spouse of"
                      : r.type === "biological_parent"
                        ? "parent of"
                        : r.type;

                return (
                  <p key={i} className="text-sm text-white/50">
                    <span className="text-white/80">{parentName}</span>
                    <span className="mx-2 text-[#7fdb9a]">{typeLabel}</span>
                    <span className="text-white/80">{childName}</span>
                  </p>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-400">{error}</p>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleImport}
            className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-8 py-3 font-semibold text-[#0f1a14] transition hover:opacity-90"
          >
            Import {preview.persons.length} People
          </button>
          <button
            onClick={() => {
              setStep("input");
              setPreview(null);
              setError(null);
            }}
            className="rounded-xl border border-white/20 px-8 py-3 font-semibold transition hover:bg-white/5"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  // Input step
  return (
    <div>
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-3 text-sm font-medium text-white/60">
          TreeDown Format
        </h3>
        <div className="space-y-1 text-sm text-white/40">
          <p>
            Use indentation to show parent-child relationships.
          </p>
          <p>
            Use <code className="rounded bg-white/10 px-1.5 text-[#7fdb9a]">&amp;</code>{" "}
            to join couples (e.g. &quot;John &amp; Jane&quot;).
          </p>
          <p>Children go indented under their parents.</p>
        </div>
        <pre className="mt-3 rounded-lg bg-black/30 p-3 text-xs text-white/50">
{`Grandpa & Grandma
  Dad & Mom
    Child 1
    Child 2
  Uncle
`}
        </pre>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your TreeDown family tree here..."
        rows={16}
        className="mb-4 w-full rounded-2xl border border-white/20 bg-white/5 p-4 font-mono text-sm text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
      />

      {error && (
        <p className="mb-4 text-sm text-red-400">{error}</p>
      )}

      <div className="flex gap-4">
        <button
          onClick={handlePreview}
          disabled={!text.trim()}
          className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-8 py-3 font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
        >
          Preview
        </button>
        <button
          onClick={() => router.push(`/graph/${graphId}`)}
          className="rounded-xl border border-white/20 px-8 py-3 font-semibold transition hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
