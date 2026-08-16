import type { HighlightyOptions } from './types';

export function normalizeURLPhrases(urlPhrases: unknown): string[] {
  if (!Array.isArray(urlPhrases)) return [];
  return [
    ...new Set(
      urlPhrases
        .filter((phrase): phrase is string => typeof phrase === 'string')
        .map((phrase) => phrase.trim())
        .filter(Boolean),
    ),
  ];
}

export function urlMatchesAny(url: string, urlPhrases: unknown): boolean {
  return normalizeURLPhrases(urlPhrases).some((urlPhrase) => url.includes(urlPhrase));
}

export function isAllowedURL(url: string, options: Partial<HighlightyOptions>): boolean {
  const denylisted = Boolean(options.enableURLDenylist) && urlMatchesAny(url, options.denylist);
  const allowlisted = urlMatchesAny(url, options.allowlist);
  return !(denylisted || (options.enableURLAllowlist && !allowlisted));
}
