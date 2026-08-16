import type { PhraseList, SortOrder } from './types';

const SORT_ORDERS = new Set<SortOrder>(['None', 'A-Z', 'Z-A']);

export function normalizePhrases(phrases: unknown): string[] {
  if (!Array.isArray(phrases)) return [];
  return [
    ...new Set(
      phrases
        .filter((phrase): phrase is string => typeof phrase === 'string')
        .map((phrase) => phrase.trim())
        .filter(Boolean),
    ),
  ];
}

export function addUniquePhrases(
  existingPhrases: unknown,
  newPhrases: unknown,
): { phrases: string[]; added: number; skipped: number } {
  const existing = normalizePhrases(existingPhrases);
  const additions = Array.isArray(newPhrases)
    ? newPhrases
        .filter((phrase): phrase is string => typeof phrase === 'string')
        .map((phrase) => phrase.trim())
        .filter(Boolean)
    : [];
  const phrases = [...existing];
  let skipped = 0;

  for (const phrase of additions) {
    if (phrases.includes(phrase)) skipped++;
    else phrases.push(phrase);
  }
  return { phrases, added: phrases.length - existing.length, skipped };
}

export function isPhraseListEnabled(list: Partial<PhraseList> | null | undefined): boolean {
  return normalizeListEnabled(list);
}

export function normalizeListEnabled(list: Partial<PhraseList> | null | undefined): boolean {
  if (typeof list?.enabled === 'boolean') return list.enabled;
  if (typeof list?.toggled === 'boolean') return list.toggled;
  return true;
}

export function normalizeSortOrder(order: unknown): SortOrder {
  return SORT_ORDERS.has(order as SortOrder) ? (order as SortOrder) : 'None';
}

export function sortPhrases(phrases: unknown, order: unknown = 'None'): string[] {
  const sorted = Array.isArray(phrases)
    ? phrases.filter((phrase): phrase is string => typeof phrase === 'string').slice()
    : [];
  const normalizedOrder = normalizeSortOrder(order);
  if (normalizedOrder === 'None') return sorted;

  sorted.sort((a, b) => {
    const first = a.toLowerCase();
    const second = b.toLowerCase();
    if (first < second) return -1;
    if (first > second) return 1;
    return 0;
  });
  if (normalizedOrder === 'Z-A') sorted.reverse();
  return sorted;
}

export function sortStoredPhraseLists(
  highlighter: PhraseList[],
  order: unknown = 'None',
): PhraseList[] {
  const normalizedOrder = normalizeSortOrder(order);
  if (normalizedOrder === 'None') return highlighter;
  for (const phraseList of highlighter) {
    phraseList.phrases = sortPhrases(phraseList.phrases, normalizedOrder);
  }
  return highlighter;
}

export function clonePhraseLists(highlighter: PhraseList[] | null | undefined): PhraseList[] {
  return Array.isArray(highlighter)
    ? highlighter.map((list) => ({ ...list, phrases: [...(list.phrases || [])] }))
    : [];
}
