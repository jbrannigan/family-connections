/**
 * Archive Export — generate human-readable plain-text and JSON exports
 * of a family graph.
 *
 * The plain-text format is a narrative document that anyone can read,
 * print, and understand without software. It reads like a family archive.
 *
 * The JSON format is a structured dump for programmatic use / re-import.
 */

import type {
  Person,
  Relationship,
  FamilyGraph,
  StoryWithAuthor,
} from "@/types/database";
import { resolveUnions, formatUnionDateRange } from "./union-utils";

// ── Plain-text archive ──────────────────────────────────

/**
 * Generate a human-readable plain-text archive of the entire family graph.
 */
export function generateArchiveText(
  graph: FamilyGraph,
  persons: Person[],
  relationships: Relationship[],
  stories: StoryWithAuthor[],
): string {
  const lines: string[] = [];
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Build lookup maps
  const personMap = new Map<string, Person>();
  for (const p of persons) personMap.set(p.id, p);

  const storiesByPerson = new Map<string, StoryWithAuthor[]>();
  for (const s of stories) {
    if (!storiesByPerson.has(s.person_id)) storiesByPerson.set(s.person_id, []);
    storiesByPerson.get(s.person_id)!.push(s);
  }

  // Count relationships
  const relCount = relationships.length;
  const storyCount = stories.length;

  // Header
  const title = graph.name.toUpperCase();
  const border = "═".repeat(52);
  lines.push(`╔${border}╗`);
  lines.push(`║  ${padRight(title, 50)}║`);
  lines.push(`║  ${"Family Connections Archive".padEnd(50)}║`);
  lines.push(`║  ${padRight(`Exported: ${dateStr}`, 50)}║`);
  lines.push(
    `║  ${padRight(`${persons.length} people · ${relCount} relationships · ${storyCount} stories`, 50)}║`,
  );
  lines.push(`╚${border}╝`);
  lines.push("");
  lines.push(
    `This file is a plain-text archive of the ${graph.name}`,
  );
  lines.push(
    "family tree. It contains all known facts, stories, and",
  );
  lines.push(
    "relationships. No special software is needed to read this file.",
  );
  lines.push("");

  // Sort persons alphabetically
  const sortedPersons = [...persons].sort((a, b) =>
    a.display_name.localeCompare(b.display_name),
  );

  // Render each person
  for (const person of sortedPersons) {
    lines.push("─".repeat(52));
    lines.push("");
    lines.push(person.display_name.toUpperCase());

    // Nickname / preferred name
    if (person.preferred_name) {
      lines.push(`  Goes by "${person.preferred_name}"`);
    } else if (person.nickname) {
      lines.push(`  "${person.nickname}"`);
    }

    // Pronouns
    if (person.pronouns) {
      lines.push(`  Pronouns: ${person.pronouns}`);
    }

    // Dates
    if (person.birth_date) {
      const loc = person.birth_location
        ? `, ${person.birth_location}`
        : "";
      lines.push(`  Born: ${person.birth_date}${loc}`);
    } else if (person.birth_location) {
      lines.push(`  From: ${person.birth_location}`);
    }
    if (person.death_date) {
      lines.push(`  Died: ${person.death_date}`);
    }

    // Unions (marriages, partnerships)
    const unions = resolveUnions(person.id, relationships, persons);
    if (unions.length > 0) {
      lines.push("");
      for (const u of unions) {
        const dateRange = formatUnionDateRange(u.startDate, u.endDate);
        const dateSuffix = dateRange ? ` (${dateRange})` : "";
        lines.push(
          `  ${u.label} to ${u.partner.display_name}${dateSuffix}.`,
        );
      }
    }

    // Children
    const children = getChildren(person.id, relationships, personMap);
    if (children.length > 0) {
      lines.push("");
      lines.push("  Children:");
      for (const child of children) {
        const birthYear = child.birth_date
          ? ` (b. ${child.birth_date.split("-")[0]})`
          : "";
        lines.push(`    · ${child.display_name}${birthYear}`);
      }
    }

    // Parents
    const parents = getParents(person.id, relationships, personMap);
    if (parents.length > 0) {
      lines.push("");
      lines.push("  Parents:");
      for (const parent of parents) {
        lines.push(`    · ${parent.display_name}`);
      }
    }

    // Notes
    if (person.notes) {
      lines.push("");
      lines.push("  Notes:");
      // Indent and wrap each line of notes
      for (const noteLine of person.notes.split("\n")) {
        lines.push(`    ${noteLine}`);
      }
    }

    // Stories
    const personStories = storiesByPerson.get(person.id);
    if (personStories && personStories.length > 0) {
      lines.push("");
      lines.push("  Stories:");
      for (const story of personStories) {
        const funFact = story.is_fun_fact ? " (Fun Fact)" : "";
        const author = story.author_name
          ? ` — ${story.author_name}`
          : "";
        // Quote the story content
        const storyLines = story.content.split("\n");
        lines.push(`    "${storyLines[0]}`);
        for (let i = 1; i < storyLines.length; i++) {
          lines.push(`     ${storyLines[i]}`);
        }
        if (storyLines.length === 1) {
          // Close quote on same line
          lines[lines.length - 1] =
            lines[lines.length - 1].replace(/^(\s*".*)$/, '$1"');
        } else {
          lines.push(`     "`);
        }
        lines.push(`    ${funFact}${author}`.trimEnd());
      }
    }

    lines.push("");
  }

  // Footer
  lines.push("─".repeat(52));
  lines.push("");
  lines.push(`End of archive. ${persons.length} persons documented.`);
  lines.push(`Generated by Family Connections on ${dateStr}.`);
  lines.push("");

  return lines.join("\n");
}

// ── JSON export ─────────────────────────────────────────

/**
 * Generate a structured JSON export of the entire family graph.
 */
export function generateArchiveJSON(
  graph: FamilyGraph,
  persons: Person[],
  relationships: Relationship[],
  stories: StoryWithAuthor[],
): object {
  return {
    exportVersion: "1.0",
    exportDate: new Date().toISOString(),
    generator: "Family Connections",
    graph: {
      id: graph.id,
      name: graph.name,
      createdAt: graph.created_at,
    },
    persons: persons.map((p) => ({
      id: p.id,
      displayName: p.display_name,
      givenName: p.given_name,
      nickname: p.nickname,
      preferredName: p.preferred_name,
      pronouns: p.pronouns,
      birthDate: p.birth_date,
      deathDate: p.death_date,
      birthLocation: p.birth_location,
      isIncomplete: p.is_incomplete,
      notes: p.notes,
    })),
    relationships: relationships.map((r) => ({
      id: r.id,
      personA: r.person_a,
      personB: r.person_b,
      type: r.type,
      startDate: r.start_date,
      endDate: r.end_date,
    })),
    stories: stories.map((s) => ({
      id: s.id,
      personId: s.person_id,
      content: s.content,
      isFunFact: s.is_fun_fact,
      authorName: s.author_name,
      createdAt: s.created_at,
    })),
    summary: {
      personCount: persons.length,
      relationshipCount: relationships.length,
      storyCount: stories.length,
    },
  };
}

// ── Helpers ──────────────────────────────────────────────

const PARENT_TYPES = new Set([
  "biological_parent",
  "adoptive_parent",
  "step_parent",
]);

function getChildren(
  personId: string,
  relationships: Relationship[],
  personMap: Map<string, Person>,
): Person[] {
  const children: Person[] = [];
  for (const rel of relationships) {
    if (!PARENT_TYPES.has(rel.type)) continue;
    // person_a is parent, person_b is child
    if (rel.person_a === personId) {
      const child = personMap.get(rel.person_b);
      if (child) children.push(child);
    }
  }
  return children.sort((a, b) =>
    a.display_name.localeCompare(b.display_name),
  );
}

function getParents(
  personId: string,
  relationships: Relationship[],
  personMap: Map<string, Person>,
): Person[] {
  const parents: Person[] = [];
  for (const rel of relationships) {
    if (!PARENT_TYPES.has(rel.type)) continue;
    // person_a is parent, person_b is child
    if (rel.person_b === personId) {
      const parent = personMap.get(rel.person_a);
      if (parent) parents.push(parent);
    }
  }
  return parents.sort((a, b) =>
    a.display_name.localeCompare(b.display_name),
  );
}

function padRight(str: string, len: number): string {
  if (str.length >= len) return str.substring(0, len);
  return str + " ".repeat(len - str.length);
}
