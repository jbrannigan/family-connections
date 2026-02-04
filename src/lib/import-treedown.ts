/**
 * Import TreeDown text into the Family Graph data model.
 *
 * TreeDown format (extended):
 *   - Each line is a person or union
 *   - Indentation (tabs or spaces) = parent-child hierarchy
 *   - "Name1 & Name2" or "Name1 - Name2" = a union (married couple)
 *   - Children are indented under their parent/union
 *   - Parenthesized metadata is stripped: (1870-1909), (M- date), (Div), (b. date)
 *   - Only the first person in a couple is a biological child of the parent line
 *   - The second person married into the family
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
  tempId: string;
  raw: string;
  indent: number;
  children: TreeNode[];
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
  return /^[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(trimmed) && trimmed.length < 20;
}

/**
 * Strip parenthesized metadata from a line, preserving nickname parens.
 * Handles nested parentheses by finding balanced groups.
 *
 * Keeps: Margaret (Peggy), Catherine (Kate)
 * Removes: (1870-1909), (M- 13 July 1894), (Div), (b. 27 October 1988),
 *          (divorced), (Divorcing 2025), (M-?), (Now Barbara McGinty),
 *          (Fran & Jack Snodgrass (M- 1976))
 */
function stripMetadata(line: string): string {
  let result = "";
  let i = 0;

  while (i < line.length) {
    if (line[i] === "(") {
      // Find the matching closing paren, handling nesting
      let depth = 1;
      let j = i + 1;
      while (j < line.length && depth > 0) {
        if (line[j] === "(") depth++;
        if (line[j] === ")") depth--;
        j++;
      }

      const inner = line.substring(i + 1, j - 1);

      if (isNickname(inner)) {
        // Keep nickname parens
        result += line.substring(i, j);
      }
      // Otherwise: skip the entire parenthesized group (remove it)

      i = j;
    } else {
      result += line[i];
      i++;
    }
  }

  // Clean up stray closing parens, trailing commas, trailing years, question marks
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
 * Detect if a cleaned line represents a union (couple).
 * Supports both " & " and " - " as separators.
 */
function findUnionSplit(
  cleaned: string,
): { separator: string; index: number } | null {
  // First try " & " — the primary separator
  const ampIdx = cleaned.indexOf(" & ");
  if (ampIdx > 0) return { separator: " & ", index: ampIdx };

  // Then try " - " — secondary separator used in the Fitzgerald branch
  const dashIdx = cleaned.indexOf(" - ");
  if (dashIdx > 0) return { separator: " - ", index: dashIdx };

  return null;
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

  // Build tree structure from indentation
  const nodes: TreeNode[] = [];
  const stack: TreeNode[] = [];

  for (const line of lines) {
    const indent = getIndent(line);
    const raw = stripMetadata(line.trim());

    // Skip empty lines after stripping
    if (!raw) continue;

    const node: TreeNode = { tempId: tempId(), raw, indent, children: [] };

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
    const union = findUnionSplit(node.raw);

    if (union) {
      const nameA = node.raw.substring(0, union.index).trim();
      const nameB = node.raw.substring(union.index + union.separator.length).trim();

      // Skip empty or placeholder names
      if (!nameA || nameA === "?") {
        warnings.push(`Skipping unnamed person in: ${node.raw}`);
        return;
      }

      const idA = getOrCreatePerson(nameA);
      const idB = nameB && nameB !== "?"
        ? getOrCreatePerson(nameB)
        : null;

      // Spouse relationship
      if (idB) {
        relationships.push({
          parentTempId: idA,
          childTempId: idB,
          type: "spouse",
        });
      }

      // Only the FIRST person (A) is a biological child of the parent
      // The second person (B) married into the family
      for (const pid of parentIds) {
        relationships.push({
          parentTempId: pid,
          childTempId: idA,
          type: "biological_parent",
        });
      }

      // Children of this union have both spouses as parents
      const childParents = idB ? [idA, idB] : [idA];
      for (const child of node.children) {
        processNode(child, childParents);
      }
    } else {
      // Single person
      const name = node.raw.trim();
      if (!name || name === "?") {
        warnings.push(`Skipping unnamed person`);
        return;
      }

      const id = getOrCreatePerson(name);

      // Connect to parents
      for (const pid of parentIds) {
        relationships.push({
          parentTempId: pid,
          childTempId: id,
          type: "biological_parent",
        });
      }

      // Process children
      for (const child of node.children) {
        processNode(child, [id]);
      }
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
