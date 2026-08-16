export interface PhraseListSource {
  listIndex: number;
  phrases: string[];
}

export interface HighlightAssignment {
  phrase: string;
  listIndexes: number[];
}

function phraseKey(phrase: string, caseSensitive: boolean): string {
  return caseSensitive ? phrase : phrase.toLowerCase();
}

export function buildHighlightAssignments(
  sources: PhraseListSource[],
  caseSensitive: boolean,
): HighlightAssignment[] {
  const assignments = new Map<string, HighlightAssignment>();

  for (const source of sources) {
    for (const value of source.phrases) {
      const phrase = typeof value === 'string' ? value.trim() : '';
      if (!phrase) continue;

      const key = phraseKey(phrase, caseSensitive);
      const existing = assignments.get(key);
      if (existing) {
        if (!existing.listIndexes.includes(source.listIndex)) {
          existing.listIndexes.push(source.listIndex);
        }
      } else {
        assignments.set(key, { phrase, listIndexes: [source.listIndex] });
      }
    }
  }

  return [...assignments.values()];
}

export function findHighlightAssignment(
  matchedText: string,
  assignments: HighlightAssignment[],
  caseSensitive: boolean,
): HighlightAssignment | undefined {
  const key = phraseKey(matchedText, caseSensitive);
  return assignments.find((assignment) => phraseKey(assignment.phrase, caseSensitive) === key);
}
