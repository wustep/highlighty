(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HighlightyCore = Object.assign(root.HighlightyCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeURLPhrases(urlPhrases) {
    if (!Array.isArray(urlPhrases)) return [];
    return [
      ...new Set(
        urlPhrases
          .filter((phrase) => typeof phrase === 'string')
          .map((phrase) => phrase.trim())
          .filter(Boolean),
      ),
    ];
  }

  function urlMatchesAny(url, urlPhrases) {
    if (typeof url !== 'string') return false;
    return normalizeURLPhrases(urlPhrases).some((urlPhrase) => url.includes(urlPhrase));
  }

  function isAllowedURL(url, options) {
    const denylisted =
      Boolean(options?.enableURLDenylist) && urlMatchesAny(url, options?.denylist);
    const allowlisted = urlMatchesAny(url, options?.allowlist);
    return !(denylisted || (options?.enableURLAllowlist && !allowlisted));
  }

  return { isAllowedURL, normalizeURLPhrases, urlMatchesAny };
});
