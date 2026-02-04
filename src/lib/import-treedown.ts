/**
 * Import TreeDown text into the Family Graph data model.
 *
 * TreeDown format:
 *   - Each line is a person or union
 *   - Indentation = parent-child hierarchy
 *   - "Name1 & Name2" = a union (married couple)
 *   - Children are indented under their parent/union
 */

import type { RelationshipType } from "@/types/database";

interface ImportedPerson {
  tempId: string;
  displayName: string;
}

interface ImportedRelationship {
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

function isUnion(name: string): boolean {
  return /\s&\s/.test(name);
}

function splitUnion(name: string): [string, string] {
  const parts = name.split(/\s&\s/, 2);
  return [parts[0].trim(), parts[1].trim()];
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

  if (lines.length === 0) {
    return { persons, relationships, warnings: ["Empty input"] };
  }

  // Build tree structure from indentation
  const nodes: TreeNode[] = [];
  const stack: TreeNode[] = [];

  for (const line of lines) {
    const indent = getIndent(line);
    const raw = line.trim();

    // Skip lines that look like metadata (start with b., d., m., etc.)
    if (/^[a-z]\.\s/.test(raw)) continue;

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

  // Process nodes recursively
  function processNode(node: TreeNode, parentIds: string[]) {
    if (isUnion(node.raw)) {
      const [nameA, nameB] = splitUnion(node.raw);
      const idA = tempId();
      const idB = tempId();

      persons.push({ tempId: idA, displayName: nameA });
      persons.push({ tempId: idB, displayName: nameB });

      // Spouse relationship
      relationships.push({
        parentTempId: idA,
        childTempId: idB,
        type: "spouse",
      });

      // Both spouses are children of the parent (if any)
      for (const pid of parentIds) {
        relationships.push({
          parentTempId: pid,
          childTempId: idA,
          type: "biological_parent",
        });
      }

      // Children of this union have both spouses as parents
      for (const child of node.children) {
        processNode(child, [idA, idB]);
      }
    } else {
      const id = node.tempId;
      persons.push({ tempId: id, displayName: node.raw });

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
