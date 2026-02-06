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
  birthDate: string | null;
  deathDate: string | null;
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
  /** Birth date extracted from metadata */
  birthDate: string | null;
  /** Death date extracted from metadata */
  deathDate: string | null;
  /** Spouses in order, with relationship type and dates */
  spouses: { name: string; type: RelationshipType; birthDate: string | null; deathDate: string | null }[];
}

/**
 * Extract birth and death dates from a text segment.
 * Looks for patterns like: (1870-1909), (b. 1870), (1870), (1870-?)
 * Returns { birthDate, deathDate } or nulls if not found.
 */
function extractDates(text: string): { birthDate: string | null; deathDate: string | null } {
  let birthDate: string | null = null;
  let deathDate: string | null = null;

  // Pattern 1: (YYYY-YYYY) or (YYYY-?) for lifespan
  const lifespanMatch = text.match(/\((\d{4})\s*-\s*(\d{4}|\?)\)/);
  if (lifespanMatch) {
    birthDate = lifespanMatch[1];
    if (lifespanMatch[2] !== "?") {
      deathDate = lifespanMatch[2];
    }
    return { birthDate, deathDate };
  }

  // Pattern 2: (b. YYYY) or (b YYYY) for birth only
  const birthOnlyMatch = text.match(/\(b\.?\s*(\d{4})\)/i);
  if (birthOnlyMatch) {
    birthDate = birthOnlyMatch[1];
    return { birthDate, deathDate };
  }

  // Pattern 3: Standalone (YYYY) - assume birth year
  const standaloneYearMatch = text.match(/\((\d{4})\)(?!\s*-)/);
  if (standaloneYearMatch) {
    birthDate = standaloneYearMatch[1];
    return { birthDate, deathDate };
  }

  // Pattern 4: "- stillborn" indicates death at birth
  if (/stillborn/i.test(text)) {
    // Try to find a birth year nearby
    const yearMatch = text.match(/\((\d{4})/);
    if (yearMatch) {
      birthDate = yearMatch[1];
      deathDate = yearMatch[1]; // Same year
    }
  }

  return { birthDate, deathDate };
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

    // Extract dates for primary person
    const primaryDates = extractDates(segments[0]);

    const spouses: { name: string; type: RelationshipType; birthDate: string | null; deathDate: string | null }[] = [];

    for (let i = 1; i < segments.length; i++) {
      const rawSegment = segments[i];
      const cleanName = stripMetadata(rawSegment);

      if (!cleanName || cleanName === "?") continue;

      // Extract dates for spouse
      const spouseDates = extractDates(rawSegment);

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

      spouses.push({
        name: cleanName,
        type: relType,
        birthDate: spouseDates.birthDate,
        deathDate: spouseDates.deathDate,
      });
    }

    return { primaryName, birthDate: primaryDates.birthDate, deathDate: primaryDates.deathDate, spouses };
  }

  // Check for dash-separated union (simple single marriage)
  const dashPos = findTopLevelDash(raw);
  if (dashPos !== null) {
    const primaryRaw = raw.substring(0, dashPos - 1);
    const spouseRaw = raw.substring(dashPos + 2);
    const primaryName = stripMetadata(primaryRaw);
    const spouseName = stripMetadata(spouseRaw);

    if (!primaryName || primaryName === "?") return null;

    const primaryDates = extractDates(primaryRaw);
    const spouses: { name: string; type: RelationshipType; birthDate: string | null; deathDate: string | null }[] = [];

    if (spouseName && spouseName !== "?") {
      const spouseDates = extractDates(spouseRaw);
      // Check if divorced
      const isDivorced = hasDivorceIndicator(raw);
      spouses.push({
        name: spouseName,
        type: isDivorced ? "ex_spouse" : "spouse",
        birthDate: spouseDates.birthDate,
        deathDate: spouseDates.deathDate,
      });
    }

    return { primaryName, birthDate: primaryDates.birthDate, deathDate: primaryDates.deathDate, spouses };
  }

  // Single person (no union)
  const name = stripMetadata(raw);
  if (!name || name === "?") return null;

  const dates = extractDates(raw);
  return { primaryName: name, birthDate: dates.birthDate, deathDate: dates.deathDate, spouses: [] };
}

/**
 * Common female first names for gender inference.
 * Used to determine if children should take spouse's surname.
 */
const FEMALE_NAMES = new Set([
  "mary", "margaret", "peggy", "anne", "anna", "ann", "eileen", "helen",
  "catherine", "kate", "cathy", "kathy", "elizabeth", "betty", "dorothy",
  "dot", "loreen", "carol", "alice", "monica", "jean", "nancy", "sally",
  "barbara", "theresa", "teresa", "fran", "frances", "sharon", "charlene",
  "regina", "gina", "maureen", "jo", "joanne", "kim", "lisa", "juliet",
  "bridget", "caitlin", "karen", "kelly", "megan", "maggie", "paige",
  "jessica", "sydney", "sarah", "emily", "abby", "madeline", "madeleine",
  "alanna", "lily", "olivia", "nicole", "kierston", "hanna", "kacie",
  "anya", "christine", "heather", "tiffany", "alison", "kathleen", "rachel",
  "melody", "alyssa", "katrina", "marissa", "valerie", "kiersten", "angela",
  "colleen", "samantha", "trish", "deirdre", "felicia", "michelle", "laurie",
  "kristin", "ashley", "kristie", "rose", "susan", "linda", "robin", "ellen",
  "leslie", "laura", "denise", "arlene", "joanne", "reece", "katie", "julie",
]);

/**
 * Common male first names for gender inference.
 */
const MALE_NAMES = new Set([
  "john", "james", "jim", "thomas", "tom", "joseph", "joe", "michael",
  "william", "bill", "robert", "bob", "charles", "chuck", "george",
  "edward", "ed", "richard", "dick", "frank", "paul", "peter", "stephen",
  "steve", "mark", "david", "daniel", "dan", "patrick", "sean", "kevin",
  "timothy", "tim", "gerald", "gerry", "dennis", "martin", "marty",
  "lawrence", "larry", "gary", "douglas", "doug", "glenn", "steven",
  "andrew", "christopher", "chris", "nicholas", "nick", "ryan", "kyle",
  "matthew", "matt", "brian", "bryan", "justin", "jacob", "ian", "alec",
  "connor", "nolan", "broderick", "samuel", "sam", "scott", "lee", "julian",
  "aaron", "eric", "toby", "christian", "cameron", "ron", "brenton",
  "tyler", "kenneth", "simon", "navid", "brett", "gerard",
]);

/**
 * Infer gender from a first name.
 * Returns "male", "female", or null if unknown.
 */
function inferGender(fullName: string): "male" | "female" | null {
  // Extract first name (before any nickname or surname)
  const withoutNicknames = fullName.replace(/\s*\([^)]+\)\s*/g, " ").trim();
  const parts = withoutNicknames.split(/\s+/);
  if (parts.length === 0) return null;

  const firstName = parts[0].toLowerCase();

  if (FEMALE_NAMES.has(firstName)) return "female";
  if (MALE_NAMES.has(firstName)) return "male";

  return null;
}

/**
 * Extract surname from a full name.
 * Handles nicknames in parentheses: "Margaret (Peggy) McGinty" → "McGinty"
 * Returns null if no surname found (single word name).
 */
function extractSurname(fullName: string): string | null {
  // Remove nicknames in parentheses for surname extraction
  const withoutNicknames = fullName.replace(/\s*\([^)]+\)\s*/g, " ").trim();
  const parts = withoutNicknames.split(/\s+/);

  // If only one word, no surname to extract
  if (parts.length < 2) return null;

  // Last word is the surname
  return parts[parts.length - 1];
}

/**
 * Check if a name appears to be a first-name-only (no surname).
 * Returns true for: "John", "Mary", "James III", "John Daniel"
 * Returns false for: "John McGinty", "Margaret (Peggy) McGinty"
 */
function isFirstNameOnly(name: string): boolean {
  // Remove nicknames for analysis
  const withoutNicknames = name.replace(/\s*\([^)]+\)\s*/g, " ").trim();
  const parts = withoutNicknames.split(/\s+/);

  // Single word is definitely first name only
  if (parts.length === 1) return true;

  // Two words where second is a suffix (Jr, II, III, IV) is first name only
  if (parts.length === 2) {
    const suffixes = ["Jr", "Jr.", "II", "III", "IV", "V"];
    if (suffixes.includes(parts[1])) return true;
  }

  // Two common first names together (like "Mary Eileen", "John Daniel") - harder to detect
  // For now, assume 2+ words means it has a surname unless it's a suffix
  return false;
}

/**
 * Add surname to a first-name-only name.
 * Preserves nicknames: "Margaret (Peggy)" + "McGinty" → "Margaret (Peggy) McGinty"
 */
function addSurname(firstName: string, surname: string): string {
  // Check if there's a nickname at the end
  const nicknameMatch = firstName.match(/^(.+?)(\s*\([^)]+\))$/);
  if (nicknameMatch) {
    // Insert surname before nickname
    return `${nicknameMatch[1].trim()} ${surname}${nicknameMatch[2]}`;
  }
  return `${firstName} ${surname}`;
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

  function getOrCreatePerson(
    name: string,
    birthDate: string | null,
    deathDate: string | null,
  ): string {
    const clean = name.trim();
    if (!clean) return tempId();

    // Create a unique key using name + birth year (if available)
    // This prevents merging people with the same name but different birth years
    const birthYear = birthDate || "unknown";
    const uniqueKey = `${clean}|${birthYear}`;

    // Check if we already have this exact name+birthYear combination
    const existing = nameToId.get(uniqueKey);
    if (existing) return existing;

    const id = tempId();
    persons.push({ tempId: id, displayName: clean, birthDate, deathDate });
    nameToId.set(uniqueKey, id);
    return id;
  }

  // Process nodes recursively
  // inheritedSurname: surname to apply to children who only have first names
  function processNode(node: TreeNode, parentIds: string[], inheritedSurname: string | null) {
    const parsed = parseLine(node.raw);

    if (!parsed) {
      warnings.push(`Skipping unparseable line: ${node.raw.substring(0, 60)}`);
      return;
    }

    // Apply inherited surname if this person only has a first name
    let primaryName = parsed.primaryName;
    if (inheritedSurname && isFirstNameOnly(primaryName)) {
      primaryName = addSurname(primaryName, inheritedSurname);
    }

    // Extract surname from this person to pass to their children
    const primarySurname = extractSurname(primaryName) || inheritedSurname;

    const primaryId = getOrCreatePerson(primaryName, parsed.birthDate, parsed.deathDate);

    // Connect primary person to parents (biological child)
    for (const pid of parentIds) {
      relationships.push({
        parentTempId: pid,
        childTempId: primaryId,
        type: "biological_parent",
      });
    }

    // Create spouse relationships and track the last spouse's surname
    const spouseIds: string[] = [];
    let lastSpouseSurname: string | null = null;
    for (const spouse of parsed.spouses) {
      // Spouses keep their own names (don't inherit surname)
      const spouseId = getOrCreatePerson(spouse.name, spouse.birthDate, spouse.deathDate);
      spouseIds.push(spouseId);

      // Track the last (current) spouse's surname for children
      // Only use non-divorced spouses for surname inheritance
      if (spouse.type === "spouse" || spouse.type === "partner") {
        const spouseSurname = extractSurname(spouse.name);
        if (spouseSurname) {
          lastSpouseSurname = spouseSurname;
        }
      }

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

    // Determine surname for children:
    // In Western naming conventions, children typically take the father's surname.
    // We infer gender from first names to determine which parent's surname to use.
    //
    // Cases:
    // 1. "John McGinty & Mary Fousek" → John is male, children get McGinty
    // 2. "Peggy McGinty & James Brannigan" → Peggy is female, James is male, children get Brannigan
    // 3. Unknown gender → fall back to inherited surname logic
    let childSurname: string | null;

    const primaryGender = inferGender(primaryName);
    const lastSpouse = parsed.spouses.length > 0 ? parsed.spouses[parsed.spouses.length - 1] : null;
    const spouseGender = lastSpouse ? inferGender(lastSpouse.name) : null;

    if (primaryGender === "male" && primarySurname) {
      // Primary is male - children get primary's surname
      // e.g., John McGinty & Mary Fousek → children are McGinty
      childSurname = primarySurname;
    } else if (primaryGender === "female" && lastSpouseSurname) {
      // Primary is female with a spouse - children get spouse's surname
      // e.g., Peggy McGinty & James Brannigan → children are Brannigan
      childSurname = lastSpouseSurname;
    } else if (spouseGender === "male" && lastSpouseSurname) {
      // Spouse is male - children get spouse's surname
      childSurname = lastSpouseSurname;
    } else if (spouseGender === "female" && primarySurname) {
      // Spouse is female - children get primary's surname
      childSurname = primarySurname;
    } else if (primarySurname && primarySurname === inheritedSurname) {
      // Unknown genders, but primary matches inherited - assume line continuation
      childSurname = primarySurname;
    } else if (lastSpouseSurname) {
      // Unknown genders, use spouse's surname
      childSurname = lastSpouseSurname;
    } else if (primarySurname) {
      // No spouse surname, use primary's
      childSurname = primarySurname;
    } else {
      // Fall back to inherited
      childSurname = inheritedSurname;
    }

    for (const child of node.children) {
      processNode(child, childParents, childSurname);
    }
  }

  for (const rootNode of nodes) {
    processNode(rootNode, [], null);
  }

  if (persons.length === 0) {
    warnings.push("No persons found in input");
  }

  return { persons, relationships, warnings };
}
