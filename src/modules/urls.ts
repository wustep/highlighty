import type { HighlightyOptions, PhraseList } from './types';

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

interface URLPattern {
  hostname?: string;
  includeSubdomains: boolean;
  pathPrefix: string;
}

function normalizePathPrefix(path: string): string | null {
  if (!path.startsWith('/') || /[\s?#\\]/.test(path) || /%(?![0-9a-f]{2})/i.test(path)) {
    return null;
  }
  return path.replace(/\/+$/, '') || '/';
}

function normalizeHostname(hostname: string): string | null {
  if (
    !hostname.includes('.') ||
    hostname.startsWith('.') ||
    hostname.endsWith('.') ||
    /[\s*:@?#\\/]/.test(hostname)
  ) {
    return null;
  }

  try {
    const parsed = new URL(`http://${hostname}`);
    const normalized = parsed.hostname;
    const validLabels = normalized
      .split('.')
      .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
    return parsed.host === normalized && normalized.length <= 253 && validLabels
      ? normalized
      : null;
  } catch {
    return null;
  }
}

function parseURLPattern(pattern: string): URLPattern | null {
  if (pattern.startsWith('/')) {
    const pathPrefix = normalizePathPrefix(pattern);
    return pathPrefix ? { includeSubdomains: false, pathPrefix } : null;
  }

  const slashIndex = pattern.indexOf('/');
  const hostPattern = slashIndex < 0 ? pattern : pattern.slice(0, slashIndex);
  const pathPattern = slashIndex < 0 ? '/' : pattern.slice(slashIndex);
  const includeSubdomains = hostPattern.startsWith('*.');
  const hostname = normalizeHostname(includeSubdomains ? hostPattern.slice(2) : hostPattern);
  const pathPrefix = normalizePathPrefix(pathPattern);
  return hostname && pathPrefix ? { hostname, includeSubdomains, pathPrefix } : null;
}

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return prefix === '/' || pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function urlMatchesPattern(url: string, pattern: string): boolean {
  let parsedURL: URL;
  try {
    parsedURL = new URL(url);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(parsedURL.protocol)) return false;

  const parsedPattern = parseURLPattern(pattern.trim());
  if (!parsedPattern) return false;

  if (parsedPattern.hostname) {
    const hostMatches = parsedPattern.includeSubdomains
      ? parsedURL.hostname !== parsedPattern.hostname &&
        parsedURL.hostname.endsWith(`.${parsedPattern.hostname}`)
      : parsedURL.hostname === parsedPattern.hostname;
    if (!hostMatches) return false;
  }

  return pathMatchesPrefix(parsedURL.pathname, parsedPattern.pathPrefix);
}

export function urlMatchesAny(url: string, urlPhrases: unknown): boolean {
  return normalizeURLPhrases(urlPhrases).some((urlPhrase) => urlMatchesPattern(url, urlPhrase));
}

export function isAllowedURL(url: string, options: Partial<HighlightyOptions>): boolean {
  const denylisted = Boolean(options.enableURLDenylist) && urlMatchesAny(url, options.denylist);
  const allowlisted = urlMatchesAny(url, options.allowlist);
  return !(denylisted || (options.enableURLAllowlist && !allowlisted));
}

export function isURLAllowedForPhraseList(url: string, list: Partial<PhraseList>): boolean {
  if (urlMatchesAny(url, list.denylist)) return false;
  const allowlist = normalizeURLPhrases(list.allowlist);
  return allowlist.length === 0 || urlMatchesAny(url, allowlist);
}
