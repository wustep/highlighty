(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HighlightyCore = Object.assign(root.HighlightyCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function escapePhrase(phrase) {
    return String(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function buildPhraseRegExp(phrases, options = {}) {
    const sources = (Array.isArray(phrases) ? phrases : [])
      .filter((phrase) => typeof phrase === 'string' && phrase.trim())
      .map((phrase) => phrase.trim())
      .map((phrase) => {
        const escaped = escapePhrase(phrase);
        if (options.partialMatch) return escaped;
        const startsWithWord = /^[\p{L}\p{N}_]/u.test(phrase);
        const endsWithWord = /[\p{L}\p{N}_]$/u.test(phrase);
        return `${startsWithWord ? '(?<![\\p{L}\\p{N}_])' : ''}${escaped}${
          endsWithWord ? '(?![\\p{L}\\p{N}_])' : ''
        }`;
      });
    if (!sources.length) return null;

    const source = `(?:${sources.join('|')})`;
    return new RegExp(source, options.caseSensitive ? 'u' : 'iu');
  }

  function prepareHilitorOptions(options = {}, overrides = {}) {
    return {
      caseSensitive: !options.enableCaseInsensitive,
      partialMatch: Boolean(options.enablePartialMatch),
      ...overrides,
    };
  }

  return { buildPhraseRegExp, escapePhrase, prepareHilitorOptions };
});
