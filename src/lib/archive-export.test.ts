import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateArchiveText, generateArchiveJSON } from "./archive-export";
import type {
  Person,
  Relationship,
  FamilyGraph,
  StoryWithAuthor,
} from "@/types/database";

// ── Helpers ──────────────────────────────────────────────

function makePerson(overrides: Partial<Person> & { id: string }): Person {
  return {
    graph_id: "g1",
    display_name: "Test Person",
    given_name: null,
    nickname: null,
    preferred_name: null,
    avatar_url: null,
    pronouns: null,
    birth_date: null,
    death_date: null,
    birth_location: null,
    is_incomplete: false,
    notes: null,
    created_by: "u1",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

function makeRel(
  overrides: Partial<Relationship> & {
    person_a: string;
    person_b: string;
    type: string;
  },
): Relationship {
  return {
    id: `rel-${Math.random().toString(36).slice(2, 8)}`,
    graph_id: "g1",
    start_date: null,
    end_date: null,
    created_by: "u1",
    created_at: "2026-01-01",
    ...overrides,
  } as Relationship;
}

function makeStory(
  overrides: Partial<StoryWithAuthor> & { person_id: string },
): StoryWithAuthor {
  return {
    id: `story-${Math.random().toString(36).slice(2, 8)}`,
    graph_id: "g1",
    content: "A test story.",
    is_fun_fact: false,
    author_id: "u1",
    author_name: null,
    created_at: "2026-01-01",
    ...overrides,
  };
}

const graph: FamilyGraph = {
  id: "g1",
  name: "McGinty Family",
  owner_id: "u1",
  invite_code: "ABCD1234",
  created_at: "2026-01-01",
};

// Mock Date for consistent output
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-02-07T12:00:00Z"));
});

// ── generateArchiveText ─────────────────────────────────

describe("generateArchiveText", () => {
  it("generates header with graph name and counts", () => {
    const john = makePerson({
      id: "john",
      display_name: "John McGinty",
      birth_date: "1870",
    });
    const text = generateArchiveText(graph, [john], [], []);

    expect(text).toContain("MCGINTY FAMILY");
    expect(text).toContain("Family Connections Archive");
    expect(text).toContain("1 people");
    expect(text).toContain("0 relationships");
    expect(text).toContain("0 stories");
  });

  it("renders person with birth date and location", () => {
    const john = makePerson({
      id: "john",
      display_name: "John McGinty",
      birth_date: "1870",
      birth_location: "County Donegal, Ireland",
      death_date: "1909",
    });
    const text = generateArchiveText(graph, [john], [], []);

    expect(text).toContain("JOHN MCGINTY");
    expect(text).toContain("Born: 1870, County Donegal, Ireland");
    expect(text).toContain("Died: 1909");
  });

  it("renders person with only birth location (no date)", () => {
    const person = makePerson({
      id: "p1",
      display_name: "Jane Doe",
      birth_location: "Dublin, Ireland",
    });
    const text = generateArchiveText(graph, [person], [], []);

    expect(text).toContain("From: Dublin, Ireland");
    expect(text).not.toContain("Born:");
  });

  it("renders preferred name and nickname", () => {
    const person = makePerson({
      id: "p1",
      display_name: "Margaret Kirk",
      preferred_name: "Peg",
      nickname: "Peggy",
    });
    const text = generateArchiveText(graph, [person], [], []);

    expect(text).toContain('Goes by "Peg"');
    // When preferred_name is set, nickname is not shown separately
    expect(text).not.toContain('"Peggy"');
  });

  it("renders nickname when no preferred name", () => {
    const person = makePerson({
      id: "p1",
      display_name: "Margaret Kirk",
      nickname: "Peggy",
    });
    const text = generateArchiveText(graph, [person], [], []);

    expect(text).toContain('"Peggy"');
  });

  it("renders pronouns", () => {
    const person = makePerson({
      id: "p1",
      display_name: "Alex Smith",
      pronouns: "they/them",
    });
    const text = generateArchiveText(graph, [person], [], []);

    expect(text).toContain("Pronouns: they/them");
  });

  it("renders marriage union", () => {
    const john = makePerson({ id: "john", display_name: "John McGinty" });
    const margaret = makePerson({
      id: "margaret",
      display_name: "Margaret Kirk",
    });
    const rels = [
      makeRel({
        person_a: "john",
        person_b: "margaret",
        type: "spouse",
        start_date: "1895",
      }),
    ];
    const text = generateArchiveText(graph, [john, margaret], rels, []);

    expect(text).toContain("Married to Margaret Kirk (since 1895).");
  });

  it("renders divorced union with date range", () => {
    const john = makePerson({ id: "john", display_name: "John McGinty" });
    const margaret = makePerson({
      id: "margaret",
      display_name: "Margaret Kirk",
    });
    const rels = [
      makeRel({
        person_a: "john",
        person_b: "margaret",
        type: "ex_spouse",
        start_date: "1958",
        end_date: "1990",
      }),
    ];
    const text = generateArchiveText(graph, [john, margaret], rels, []);

    // Check John's section
    const johnSection = extractPersonSection(text, "JOHN MCGINTY");
    expect(johnSection).toContain("Divorced to Margaret Kirk (1958–1990).");
  });

  it("renders children", () => {
    const john = makePerson({ id: "john", display_name: "John McGinty" });
    const james = makePerson({
      id: "james",
      display_name: "James McGinty",
      birth_date: "1895",
    });
    const rels = [
      makeRel({
        person_a: "john",
        person_b: "james",
        type: "biological_parent",
      }),
    ];
    const text = generateArchiveText(graph, [john, james], rels, []);

    const johnSection = extractPersonSection(text, "JOHN MCGINTY");
    expect(johnSection).toContain("Children:");
    expect(johnSection).toContain("· James McGinty (b. 1895)");
  });

  it("renders parents", () => {
    const john = makePerson({ id: "john", display_name: "John McGinty" });
    const james = makePerson({ id: "james", display_name: "James McGinty" });
    const rels = [
      makeRel({
        person_a: "john",
        person_b: "james",
        type: "biological_parent",
      }),
    ];
    const text = generateArchiveText(graph, [john, james], rels, []);

    const jamesSection = extractPersonSection(text, "JAMES MCGINTY");
    expect(jamesSection).toContain("Parents:");
    expect(jamesSection).toContain("· John McGinty");
  });

  it("renders notes", () => {
    const person = makePerson({
      id: "p1",
      display_name: "John McGinty",
      notes: "Emigrated from Ireland.\nSettled in NYC.",
    });
    const text = generateArchiveText(graph, [person], [], []);

    expect(text).toContain("Notes:");
    expect(text).toContain("    Emigrated from Ireland.");
    expect(text).toContain("    Settled in NYC.");
  });

  it("renders stories with author attribution", () => {
    const person = makePerson({
      id: "p1",
      display_name: "John McGinty",
    });
    const story = makeStory({
      person_id: "p1",
      content: "John was known for his singing voice.",
      is_fun_fact: true,
      author_name: "Jim Brannigan",
    });
    const text = generateArchiveText(graph, [person], [], [story]);

    expect(text).toContain("Stories:");
    expect(text).toContain('"John was known for his singing voice."');
    expect(text).toContain("(Fun Fact)");
    expect(text).toContain("Jim Brannigan");
  });

  it("sorts persons alphabetically", () => {
    const persons = [
      makePerson({ id: "z", display_name: "Zara Smith" }),
      makePerson({ id: "a", display_name: "Alice Jones" }),
      makePerson({ id: "m", display_name: "Margaret Kirk" }),
    ];
    const text = generateArchiveText(graph, persons, [], []);

    const aliceIdx = text.indexOf("ALICE JONES");
    const margaretIdx = text.indexOf("MARGARET KIRK");
    const zaraIdx = text.indexOf("ZARA SMITH");

    expect(aliceIdx).toBeLessThan(margaretIdx);
    expect(margaretIdx).toBeLessThan(zaraIdx);
  });

  it("renders footer with person count", () => {
    const persons = [
      makePerson({ id: "a", display_name: "Alice" }),
      makePerson({ id: "b", display_name: "Bob" }),
    ];
    const text = generateArchiveText(graph, persons, [], []);

    expect(text).toContain("End of archive. 2 persons documented.");
    expect(text).toContain("Generated by Family Connections");
  });

  it("handles person with no details gracefully", () => {
    const person = makePerson({
      id: "p1",
      display_name: "Unknown Person",
    });
    const text = generateArchiveText(graph, [person], [], []);

    expect(text).toContain("UNKNOWN PERSON");
    // Should not have any empty sections
    expect(text).not.toContain("Children:");
    expect(text).not.toContain("Parents:");
    expect(text).not.toContain("Stories:");
    expect(text).not.toContain("Notes:");
  });
});

// ── generateArchiveJSON ─────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("generateArchiveJSON", () => {
  it("includes export metadata", () => {
    const result = generateArchiveJSON(graph, [], [], []) as any;

    expect(result.exportVersion).toBe("1.0");
    expect(result.exportDate).toContain("2026-02-07");
    expect(result.generator).toBe("Family Connections");
  });

  it("includes graph info", () => {
    const result = generateArchiveJSON(graph, [], [], []) as any;

    expect(result.graph.id).toBe("g1");
    expect(result.graph.name).toBe("McGinty Family");
  });

  it("includes persons with all fields", () => {
    const person = makePerson({
      id: "p1",
      display_name: "John McGinty",
      given_name: "John",
      nickname: "Johnny",
      preferred_name: null,
      pronouns: "he/him",
      birth_date: "1870",
      death_date: "1909",
      birth_location: "County Donegal",
      notes: "A note",
    });
    const result = generateArchiveJSON(graph, [person], [], []) as any;

    expect(result.persons).toHaveLength(1);
    expect(result.persons[0].displayName).toBe("John McGinty");
    expect(result.persons[0].givenName).toBe("John");
    expect(result.persons[0].nickname).toBe("Johnny");
    expect(result.persons[0].birthDate).toBe("1870");
    expect(result.persons[0].deathDate).toBe("1909");
    expect(result.persons[0].birthLocation).toBe("County Donegal");
  });

  it("includes relationships", () => {
    const rel = makeRel({
      person_a: "john",
      person_b: "margaret",
      type: "spouse",
      start_date: "1895",
    });
    const result = generateArchiveJSON(graph, [], [rel], []) as any;

    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0].personA).toBe("john");
    expect(result.relationships[0].personB).toBe("margaret");
    expect(result.relationships[0].type).toBe("spouse");
    expect(result.relationships[0].startDate).toBe("1895");
  });

  it("includes stories with author name", () => {
    const story = makeStory({
      person_id: "p1",
      content: "A great story.",
      is_fun_fact: true,
      author_name: "Jim",
    });
    const result = generateArchiveJSON(graph, [], [], [story]) as any;

    expect(result.stories).toHaveLength(1);
    expect(result.stories[0].content).toBe("A great story.");
    expect(result.stories[0].isFunFact).toBe(true);
    expect(result.stories[0].authorName).toBe("Jim");
  });

  it("includes summary counts", () => {
    const persons = [
      makePerson({ id: "a", display_name: "A" }),
      makePerson({ id: "b", display_name: "B" }),
    ];
    const rels = [
      makeRel({ person_a: "a", person_b: "b", type: "spouse" }),
    ];
    const stories = [makeStory({ person_id: "a" })];
    const result = generateArchiveJSON(graph, persons, rels, stories) as any;

    expect(result.summary.personCount).toBe(2);
    expect(result.summary.relationshipCount).toBe(1);
    expect(result.summary.storyCount).toBe(1);
  });
});

// ── Test helpers ─────────────────────────────────────────

/** Extract the section for a specific person from the archive text */
function extractPersonSection(text: string, personNameUpper: string): string {
  const lines = text.split("\n");
  let inSection = false;
  const sectionLines: string[] = [];

  for (const line of lines) {
    if (line === personNameUpper) {
      inSection = true;
      sectionLines.push(line);
      continue;
    }
    if (inSection) {
      // Section ends at the next separator or another person heading (all caps at start of line)
      if (line.startsWith("─") && sectionLines.length > 1) break;
      sectionLines.push(line);
    }
  }

  return sectionLines.join("\n");
}
