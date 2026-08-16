import type { HighlightyOptions } from './types';

export interface PhraseMatchOptions {
  caseSensitive?: boolean;
  partialMatch?: boolean;
}

export function escapePhrase(phrase: string): string {
  return phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildPhraseRegExp(
  phrases: unknown,
  options: PhraseMatchOptions = {},
): RegExp | null {
  const sources = (Array.isArray(phrases) ? phrases : [])
    .filter((phrase): phrase is string => typeof phrase === 'string' && Boolean(phrase.trim()))
    .map((phrase) => phrase.trim())
    .sort((a, b) => b.length - a.length)
    .map((phrase) => {
      const escaped = escapePhrase(phrase);
      if (options.partialMatch) return escaped;
      const startsWithWord = /^[\p{L}\p{N}\p{M}_]/u.test(phrase);
      const endsWithWord = /[\p{L}\p{N}\p{M}_]$/u.test(phrase);
      return `${startsWithWord ? '(?<![\\p{L}\\p{N}\\p{M}_])' : ''}${escaped}${
        endsWithWord ? '(?![\\p{L}\\p{N}\\p{M}_])' : ''
      }`;
    });
  if (!sources.length) return null;

  const source = `(?:${sources.join('|')})`;
  return new RegExp(source, options.caseSensitive ? 'u' : 'iu');
}

export function prepareHilitorOptions(
  options: Partial<HighlightyOptions> = {},
  overrides: PhraseMatchOptions = {},
): PhraseMatchOptions {
  return {
    caseSensitive: !options.enableCaseInsensitive,
    partialMatch: Boolean(options.enablePartialMatch),
    ...overrides,
  };
}
