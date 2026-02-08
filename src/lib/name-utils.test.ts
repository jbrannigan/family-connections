import { describe, it, expect } from "vitest";
import { parseDisplayName, getDisplayParts } from "./name-utils";
import type { Person } from "@/types/database";

describe("parseDisplayName", () => {
  it("extracts given name and nickname from closed-paren pattern", () => {
    const result = parseDisplayName("Margaret (Peggy) McGinty");
    expect(result).toEqual({
      givenName: "Margaret",
      nickname: "Peggy",
      surname: "McGinty",
    });
  });

  it("extracts given name and nickname from unclosed-paren pattern", () => {
    const result = parseDisplayName("Margaret (Peggy McGinty");
    expect(result).toEqual({
      givenName: "Margaret",
      nickname: "Peggy",
      surname: "McGinty",
    });
  });

  it("handles name without nickname", () => {
    const result = parseDisplayName("James Brannigan");
    expect(result).toEqual({
      givenName: "James",
      nickname: null,
      surname: "Brannigan",
    });
  });

  it("handles single-word name", () => {
    const result = parseDisplayName("Madonna");
    expect(result).toEqual({
      givenName: "Madonna",
      nickname: null,
      surname: null,
    });
  });

  it("handles multi-word surname", () => {
    const result = parseDisplayName("John Daniel McGinty Jr");
    expect(result).toEqual({
      givenName: "John",
      nickname: null,
      surname: "Daniel McGinty Jr",
    });
  });

  it("handles nickname at end with no surname after", () => {
    const result = parseDisplayName("James (Jim");
    expect(result).toEqual({
      givenName: "James",
      nickname: "Jim",
      surname: null,
    });
  });

  it("handles empty string", () => {
    const result = parseDisplayName("");
    expect(result).toEqual({
      givenName: "",
      nickname: null,
      surname: null,
    });
  });

  it("handles nickname with space after unclosed paren", () => {
    const result = parseDisplayName("Dorothy (Dot");
    expect(result).toEqual({
      givenName: "Dorothy",
      nickname: "Dot",
      surname: null,
    });
  });

  it("handles long nickname with surname after closed paren", () => {
    const result = parseDisplayName("Elizabeth (Betty) Smith");
    expect(result).toEqual({
      givenName: "Elizabeth",
      nickname: "Betty",
      surname: "Smith",
    });
  });
});

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "test-id",
    graph_id: "graph-id",
    display_name: "Margaret (Peggy) McGinty",
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
    created_by: "user-id",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("getDisplayParts", () => {
  it("uses preferred_name when available", () => {
    const person = makePerson({ preferred_name: "Peggy" });
    const result = getDisplayParts(person);
    expect(result.primaryName).toBe("Peggy");
  });

  it("falls back to given_name when no preferred_name", () => {
    const person = makePerson({ given_name: "Margaret" });
    const result = getDisplayParts(person);
    expect(result.primaryName).toBe("Margaret");
  });

  it("falls back to parsing display_name when no columns set", () => {
    const person = makePerson();
    const result = getDisplayParts(person);
    expect(result.primaryName).toBe("Margaret");
    expect(result.nickname).toBe("Peggy");
  });

  it("uses database nickname over parsed nickname", () => {
    const person = makePerson({
      nickname: "Peg",
      display_name: "Margaret (Peggy) McGinty",
    });
    const result = getDisplayParts(person);
    expect(result.nickname).toBe("Peg");
  });

  it("returns fullName as display_name", () => {
    const person = makePerson();
    const result = getDisplayParts(person);
    expect(result.fullName).toBe("Margaret (Peggy) McGinty");
  });

  it("handles person with no name data gracefully", () => {
    const person = makePerson({ display_name: "Unknown" });
    const result = getDisplayParts(person);
    expect(result.primaryName).toBe("Unknown");
    expect(result.nickname).toBeNull();
  });

  it("prefers preferred_name over given_name", () => {
    const person = makePerson({
      given_name: "Margaret",
      preferred_name: "Maggie",
    });
    const result = getDisplayParts(person);
    expect(result.primaryName).toBe("Maggie");
  });
});
