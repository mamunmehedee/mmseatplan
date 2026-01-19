import type { Guest, SpousePosition } from "./types";

const spouseLabel = (name: string) => `Spouse of ${name}`;

export function buildArrangement(guests: Guest[]): { arrangement: string[]; error?: string } {
  const chiefGuests = guests.filter((g) => g.role === "Chief Guest");
  if (chiefGuests.length !== 1) {
    return { arrangement: [], error: "Exactly one Chief Guest is required." };
  }

  const chief = chiefGuests[0];
  const chiefPair = withOptionalSpouse(chief.name, chief.spousePosition);

  // Regular guests sorted by gradation
  const regulars = guests
    .filter((g) => g.role === "Regular")
    .slice()
    .sort((a, b) => (a.gradationNo ?? Number.MAX_SAFE_INTEGER) - (b.gradationNo ?? Number.MAX_SAFE_INTEGER));

  const positivePositions: Record<number, string[]> = {};
  const negativePositions: Record<number, string[]> = {};
  let position = 1;

  regulars.forEach((r, index) => {
    const pair = withOptionalSpouse(r.name, r.spousePosition);
    if (index % 2 === 0) negativePositions[-position] = pair;
    else {
      positivePositions[position] = pair;
      position++;
    }
  });

  const arrangement: string[] = [];

  Object.keys(negativePositions)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((k) => arrangement.push(...negativePositions[k]!));

  arrangement.push(...chiefPair);

  Object.keys(positivePositions)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((k) => arrangement.push(...positivePositions[k]!));

  // Custom guests without reference
  const customNoRef = guests
    .filter((g) => g.role === "Custom" && !g.referenceId)
    .slice()
    .sort((a, b) => (a.gradationNo ?? Number.MAX_SAFE_INTEGER) - (b.gradationNo ?? Number.MAX_SAFE_INTEGER));

  customNoRef.forEach((c, index) => {
    const pair = withOptionalSpouse(c.name, c.spousePosition);
    if (index % 2 === 0) arrangement.unshift(...pair);
    else arrangement.push(...pair);
  });

  // Custom guests with reference (in insertion order)
  const customRef = guests
    .filter((g) => g.role === "Custom" && !!g.referenceId)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));

  customRef.forEach((c) => {
    const pair = withOptionalSpouse(c.name, c.spousePosition);

    const ref = guests.find((g) => g.id === c.referenceId);
    if (!ref || !c.beforeAfter) {
      arrangement.push(...pair);
      return;
    }

    const idx = arrangement.indexOf(ref.name);
    if (idx === -1) {
      arrangement.push(...pair);
      return;
    }

    const insertAt = c.beforeAfter === "Before" ? idx : idx + 1;
    arrangement.splice(insertAt, 0, ...pair);
  });

  return { arrangement };
}

export function computeSerialNumbers(
  guests: Guest[],
  arrangement: string[],
): { serialNumbers: number[]; chiefIndex: number | null } {
  const chief = guests.find((g) => g.role === "Chief Guest");
  if (!chief) return { serialNumbers: [], chiefIndex: null };

  const cgName = chief.name;
  const chiefIndex = arrangement.indexOf(cgName);
  if (chiefIndex === -1) return { serialNumbers: [], chiefIndex: null };

  const total = arrangement.length;
  const maxDistance = Math.max(chiefIndex, total - 1 - chiefIndex);
  const serialNumbers = Array.from({ length: total }, () => 0);

  let serial = 1;
  for (let i = 1; i <= maxDistance; i++) {
    if (chiefIndex - i >= 0) serialNumbers[chiefIndex - i] = serial;
    if (chiefIndex + i < total) serialNumbers[chiefIndex + i] = serial;
    serial++;
  }

  serialNumbers[chiefIndex] = 0;
  const spouse = spouseLabel(cgName);
  if (chief.spousePosition === "Before" && chiefIndex > 0 && arrangement[chiefIndex - 1] === spouse) {
    serialNumbers[chiefIndex - 1] = 0;
  } else if (
    chief.spousePosition === "After" &&
    chiefIndex + 1 < total &&
    arrangement[chiefIndex + 1] === spouse
  ) {
    serialNumbers[chiefIndex + 1] = 0;
  }

  return { serialNumbers, chiefIndex };
}

export function withOptionalSpouse(name: string, spousePosition: SpousePosition): string[] {
  if (spousePosition === "N/A") return [name];
  const spouse = spouseLabel(name);
  return spousePosition === "Before" ? [spouse, name] : [name, spouse];
}
