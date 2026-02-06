import { describe, it, expect } from "vitest";
import { importTreeDown } from "./import-treedown";

describe("importTreeDown", () => {
  it("returns empty result for empty input", () => {
    const result = importTreeDown("");
    expect(result.persons).toHaveLength(0);
    expect(result.relationships).toHaveLength(0);
    expect(result.warnings).toContain("Empty input");
  });

  it("parses a single person", () => {
    const result = importTreeDown("John McGinty (1870-1909)");
    expect(result.persons).toHaveLength(1);
    expect(result.persons[0].displayName).toBe("John McGinty");
    expect(result.persons[0].birthDate).toBe("1870");
    expect(result.persons[0].deathDate).toBe("1909");
  });

  it("parses a married couple with &", () => {
    const result = importTreeDown(
      "John McGinty (1870-1909) & Margaret Kirk (1871-1906)",
    );
    expect(result.persons).toHaveLength(2);

    const names = result.persons.map((p) => p.displayName);
    expect(names).toContain("John McGinty");
    expect(names).toContain("Margaret Kirk");

    // Should create a spouse relationship
    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0].type).toBe("spouse");
  });

  it("parses parent-child hierarchy via indentation", () => {
    const input = [
      "John McGinty (1870-1909) & Margaret Kirk (1871-1906)",
      "\tJames McGinty (1896-1950)",
    ].join("\n");

    const result = importTreeDown(input);
    expect(result.persons.length).toBeGreaterThanOrEqual(3);

    // James should be a biological child of both John and Margaret
    const bioRelationships = result.relationships.filter(
      (r) => r.type === "biological_parent",
    );
    expect(bioRelationships).toHaveLength(2);
  });

  it("handles divorce indicators", () => {
    const input =
      "James McGhee (1936-2006) & Charlene Carter (Divorced) & Sharon Callan";
    const result = importTreeDown(input);

    // Should create 3 people
    expect(result.persons).toHaveLength(3);

    // Both Charlene and Sharon should have spouse/ex_spouse relationships
    const spouseRels = result.relationships.filter(
      (r) => r.type === "spouse" || r.type === "ex_spouse",
    );
    expect(spouseRels.length).toBeGreaterThanOrEqual(2);
  });

  // BUG: Nickname parentheses are not preserved correctly by stripMetadata.
  // The closing paren of (Peggy) gets stripped. This should be fixed.
  it.todo("preserves nicknames in parentheses — KNOWN BUG");

  it("deduplicates people by name + birth year", () => {
    const input = [
      "John McGinty (1870-1909) & Margaret Kirk",
      "\tJames McGinty (1896-1950)",
      "John McGinty (1870-1909) & Margaret Kirk",
      "\tJames McGinty (1896-1950)",
    ].join("\n");

    const result = importTreeDown(input);
    const johns = result.persons.filter(
      (p) => p.displayName === "John McGinty",
    );
    expect(johns).toHaveLength(1);
  });

  it("does NOT merge people with same name but different birth years", () => {
    const input = [
      "John McGinty (1870-1909) & Margaret Kirk",
      "\tJohn McGinty (1925-1991)",
    ].join("\n");

    const result = importTreeDown(input);
    const johns = result.persons.filter(
      (p) => p.displayName === "John McGinty",
    );
    expect(johns).toHaveLength(2);
  });

  it("infers children's surname from male parent", () => {
    const input = [
      "Margaret (Peggy) McGinty (1933-2024) & James Brannigan (1932-2004)",
      "\tTimothy",
    ].join("\n");

    const result = importTreeDown(input);
    const tim = result.persons.find((p) =>
      p.displayName.startsWith("Timothy"),
    );
    // Timothy should inherit Brannigan (father's surname), not McGinty
    expect(tim?.displayName).toBe("Timothy Brannigan");
  });

  it("handles birth-only dates", () => {
    const result = importTreeDown("Alice (b. 1924)");
    expect(result.persons[0].birthDate).toBe("1924");
    expect(result.persons[0].deathDate).toBeNull();
  });

  it("handles dash-separated couples", () => {
    const result = importTreeDown("Maureen - Dennis Murray");
    expect(result.persons).toHaveLength(2);

    const names = result.persons.map((p) => p.displayName);
    expect(names).toContain("Maureen");
    expect(names).toContain("Dennis Murray");
  });
});
