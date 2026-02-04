/**
 * Import TreeDown text into the Family Graph data model.
 *
 * TreeDown format (extended):
 *   - Each line is a person or union
 *   - Indentation (tabs or spaces) = parent-child hierarchy
 *   - "Name1 & Name2" or "Name1 - Name2" = a union (married couple)
 *   - Multiple marriages: "Name1 & Spouse1 (Divorced) & Spouse2"
 *   - Children are indented under their parent/union
 *   - Parenthesized metadata: (1870-1909), (M- date), (Div), (b. date)
 *   - Only the first person in a line is a biological child of the parent
 *   - Children belong to the primary person + the last/current spouse
 */

import type { RelationshipType } from "@/types/database";

export interface ImportedPerson {
  tempId: string;
  displayName: string;
}

export interface ImportedRelationship {
  parentTempId: string;
  childTempId: string;
  type: RelationshipType;
}

export interface TreeDownImportResult {
  persons: ImportedPerson[];
  relationships: ImportedRelationship[];
  warnings: string[];
}

interface TreeNode {
  raw: string; // original line content (trimmed but not metadata-stripped)
  indent: number;
  children: TreeNode[];
}

/** Parsed result of a single line */
interface ParsedLine {
  /** The primary person (first name on the line) */
  primaryName: string;
  /** Spouses in order, with relationship type */
  spouses: { name: string; type: RelationshipType }[];
}

let nextId = 0;
function tempId(): string {
  return `import-${nextId++}`;
}

function getIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  if (!match) return 0;
  const whitespace = match[1];
  // Normalize: tab = 4 spaces
  return whitespace.replace(/\t/g, "    ").length;
}

/**
 * Check if a parenthesized group is a nickname (should be kept).
 * Nicknames: (Peggy), (Kate), (Jim), (Gina), (Dot), (Betty), (Maggie), (Sam), (Marty)
 */
function isNickname(inner: string): boolean {
  const trimmed = inner.trim();
  // Exclude known metadata words that look like nicknames
  const metaWords = new Set(["Div", "Now", "Separated"]);
  if (metaWords.has(trimmed)) return false;
  // A nickname is 1-2 short words, all letters, no digits or punctuation
  return (
    /^[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(trimmed) && trimmed.length < 20
  );
}

/**
 * Strip parenthesized metadata from a text segment, preserving nickname parens.
 * Handles nested parentheses by finding balanced groups.
 */
function stripMetadata(text: string): string {
  let result = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === "(") {
      // Find the matching closing paren, handling nesting
      let depth = 1;
      let j = i + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === "(") depth++;
        if (text[j] === ")") depth--;
        j++;
      }

      const inner = text.substring(i + 1, j - 1);

      if (isNickname(inner)) {
        // Keep nickname parens
        result += text.substring(i, j);
      }
      // Otherwise: skip the entire parenthesized group (remove it)

      i = j;
    } else {
      result += text[i];
      i++;
    }
  }

  // Clean up stray closing parens, commas, trailing years, question marks
  result = result
    .replace(/\)/g, "") // stray closing parens
    .replace(/\s*,\s*/g, " ") // remove commas (leftover from metadata removal)
    .replace(/\s+\d{4}\s*$/, "") // trailing bare year like "Fran Adams 1945"
    .replace(/\s*\?\s*$/, "") // trailing question mark
    .replace(/\s*-\s*stillborn\s*/i, "") // remove "- stillborn"
    .replace(/\s{2,}/g, " ") // collapse spaces
    .trim();

  return result;
}

/**
 * Check if a text segment contains divorce indicators.
 */
function hasDivorceIndicator(text: string): boolean {
  return /\b(div|divorced|divorcing|separated)\b/i.test(text);
}

/**
 * Find all top-level `&` positions in a string (not inside parentheses).
 * Returns the character indices of the `&` characters.
 */
function findTopLevelAmpersands(text: string): number[] {
  const positions: number[] = [];
  let depth = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") depth = Math.max(0, depth - 1);
    else if (text[i] === "&" && depth === 0) {
      // Check it's " & " (with spaces)
      if (
        i > 0 &&
        i < text.length - 1 &&
        text[i - 1] === " " &&
        text[i + 1] === " "
      ) {
        positions.push(i);
      }
    }
  }

  return positions;
}

/**
 * Find a top-level " - " separator in a string (not inside parentheses).
 * Only returns one (the first), since dash separators are only used for
 * simple single-marriage lines.
 */
function findTopLevelDash(text: string): number | null {
  let depth = 0;

  for (let i = 0; i < text.length - 2; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") depth = Math.max(0, depth - 1);
    else if (
      depth === 0 &&
      text[i] === " " &&
      text[i + 1] === "-" &&
      text[i + 2] === " "
    ) {
      return i + 1; // position of the dash
    }
  }

  return null;
}

/**
 * Parse a raw line into a primary person and their spouses.
 * Handles multiple marriages on a single line.
 *
 * Examples:
 *   "James McGhee (1936-2006) & Charlene Carter (M- 1963, Divorced) & Sharon Callan (M- 1982, Separated)"
 *   → primary: "James McGhee", spouses: [{name: "Charlene Carter", type: "ex_spouse"}, {name: "Sharon Callan", type: "ex_spouse"}]
 *
 *   "Margaret (Peggy) McGinty (1933-2024) & James Brannigan (1932-2004) (M- 5 February 1955, NY)"
 *   → primary: "Margaret (Peggy) McGinty", spouses: [{name: "James Brannigan", type: "spouse"}]
 *
 *   "Maureen - Dennis Murray"
 *   → primary: "Maureen", spouses: [{name: "Dennis Murray", type: "spouse"}]
 *
 *   "Timothy"
 *   → primary: "Timothy", spouses: []
 */
function parseLine(raw: string): ParsedLine | null {
  // First check for ampersand-separated unions (can be multiple)
  const ampPositions = findTopLevelAmpersands(raw);

  if (ampPositions.length > 0) {
    // Split the line at each top-level &
    const segments: string[] = [];
    let start = 0;
    for (const pos of ampPositions) {
      segments.push(raw.substring(start, pos - 1)); // -1 to exclude the space before &
      start = pos + 2; // +2 to skip "& "
    }
    segments.push(raw.substring(start));

    const primaryName = stripMetadata(segments[0]);
    if (!primaryName || primaryName === "?") return null;

    const spouses: { name: string; type: RelationshipType }[] = [];

    for (let i = 1; i < segments.length; i++) {
      const rawSegment = segments[i];
      const cleanName = stripMetadata(rawSegment);

      if (!cleanName || cleanName === "?") continue;

      // Determine relationship type based on metadata in this segment
      // AND the text between this spouse and the next (or end of line)
      // Check the raw segment AND the raw text around this position for divorce indicators
      const isDivorced = hasDivorceIndicator(rawSegment);
      // If there's a subsequent spouse, this one is likely an ex
      const hasSubsequentSpouse = i < segments.length - 1;

      let relType: RelationshipType = "spouse";
      if (isDivorced || hasSubsequentSpouse) {
        relType = "ex_spouse";
      }

      spouses.push({ name: cleanName, type: relType });
    }

    return { primaryName, spouses };
  }

  // Check for dash-separated union (simple single marriage)
  const dashPos = findTopLevelDash(raw);
  if (dashPos !== null) {
    const primaryName = stripMetadata(raw.substring(0, dashPos - 1));
    const spouseName = stripMetadata(raw.substring(dashPos + 2));

    if (!primaryName || primaryName === "?") return null;

    const spouses: { name: string; type: RelationshipType }[] = [];
    if (spouseName && spouseName !== "?") {
      // Check if divorced
      const isDivorced = hasDivorceIndicator(raw);
      spouses.push({
        name: spouseName,
        type: isDivorced ? "ex_spouse" : "spouse",
      });
    }

    return { primaryName, spouses };
  }

  // Single person (no union)
  const name = stripMetadata(raw);
  if (!name || name === "?") return null;

  return { primaryName: name, spouses: [] };
}

/**
 * Parse TreeDown text into persons and relationships.
 */
export function importTreeDown(text: string): TreeDownImportResult {
  nextId = 0;
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const persons: ImportedPerson[] = [];
  const relationships: ImportedRelationship[] = [];
  const warnings: string[] = [];
  // Track names we've already created to avoid duplicates
  const nameToId = new Map<string, string>();

  if (lines.length === 0) {
    return { persons, relationships, warnings: ["Empty input"] };
  }

  // Build tree structure from indentation (using raw lines)
  const nodes: TreeNode[] = [];
  const stack: TreeNode[] = [];

  for (const line of lines) {
    const indent = getIndent(line);
    const raw = line.trim();

    // Skip empty lines
    if (!raw) continue;

    const node: TreeNode = { raw, indent, children: [] };

    // Pop stack until we find the parent (lower indent)
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (stack.length > 0) {
      stack[stack.length - 1].children.push(node);
    } else {
      nodes.push(node);
    }

    stack.push(node);
  }

  function getOrCreatePerson(name: string): string {
    const clean = name.trim();
    if (!clean) return tempId();

    // Check if we already have this exact name
    const existing = nameToId.get(clean);
    if (existing) return existing;

    const id = tempId();
    persons.push({ tempId: id, displayName: clean });
    nameToId.set(clean, id);
    return id;
  }

  // Process nodes recursively
  function processNode(node: TreeNode, parentIds: string[]) {
    const parsed = parseLine(node.raw);

    if (!parsed) {
      warnings.push(`Skipping unparseable line: ${node.raw.substring(0, 60)}`);
      return;
    }

    const primaryId = getOrCreatePerson(parsed.primaryName);

    // Connect primary person to parents (biological child)
    for (const pid of parentIds) {
      relationships.push({
        parentTempId: pid,
        childTempId: primaryId,
        type: "biological_parent",
      });
    }

    // Create spouse relationships
    const spouseIds: string[] = [];
    for (const spouse of parsed.spouses) {
      const spouseId = getOrCreatePerson(spouse.name);
      spouseIds.push(spouseId);

      relationships.push({
        parentTempId: primaryId,
        childTempId: spouseId,
        type: spouse.type,
      });
    }

    // Determine who the children's parents are:
    // - Primary person is always a parent
    // - The LAST spouse (current/most recent) is the other parent
    //   (unless there are no spouses, then just the primary)
    const lastSpouseId = spouseIds.length > 0
      ? spouseIds[spouseIds.length - 1]
      : null;
    const childParents = lastSpouseId
      ? [primaryId, lastSpouseId]
      : [primaryId];

    for (const child of node.children) {
      processNode(child, childParents);
    }
  }

  for (const rootNode of nodes) {
    processNode(rootNode, []);
  }

  if (persons.length === 0) {
    warnings.push("No persons found in input");
  }

  return { persons, relationships, warnings };
}
