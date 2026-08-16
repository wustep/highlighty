(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HighlightyCore = Object.assign(root.HighlightyCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SORT_ORDERS = new Set(['None', 'A-Z', 'Z-A']);

  function normalizePhrases(phrases) {
    if (!Array.isArray(phrases)) return [];
    return [
      ...new Set(
        phrases
          .filter((phrase) => typeof phrase === 'string')
          .map((phrase) => phrase.trim())
          .filter(Boolean),
      ),
    ];
  }

  function addUniquePhrases(existingPhrases, newPhrases) {
    const existing = normalizePhrases(existingPhrases);
    const additions = Array.isArray(newPhrases)
      ? newPhrases
          .filter((phrase) => typeof phrase === 'string')
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

  function isPhraseListEnabled(list) {
    return list?.enabled !== false && list?.toggled !== false;
  }

  function normalizeListEnabled(list) {
    if (typeof list?.enabled === 'boolean') return list.enabled;
    if (typeof list?.toggled === 'boolean') return list.toggled;
    return true;
  }

  function normalizeSortOrder(order) {
    return SORT_ORDERS.has(order) ? order : 'None';
  }

  function sortPhrases(phrases, order = 'None') {
    const sorted = Array.isArray(phrases) ? phrases.slice() : [];
    const normalizedOrder = normalizeSortOrder(order);
    if (normalizedOrder === 'None') return sorted;

    sorted.sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }),
    );
    if (normalizedOrder === 'Z-A') sorted.reverse();
    return sorted;
  }

  function sortStoredPhraseLists(highlighter, order = 'None') {
    if (!Array.isArray(highlighter)) return [];
    const normalizedOrder = normalizeSortOrder(order);
    if (normalizedOrder === 'None') return highlighter;
    for (const phraseList of highlighter) {
      phraseList.phrases = sortPhrases(phraseList.phrases, normalizedOrder);
    }
    return highlighter;
  }

  function clonePhraseLists(highlighter) {
    return Array.isArray(highlighter)
      ? highlighter.map((list) => ({ ...list, phrases: [...(list.phrases || [])] }))
      : [];
  }

  return {
    addUniquePhrases,
    clonePhraseLists,
    isPhraseListEnabled,
    normalizeListEnabled,
    normalizePhrases,
    normalizeSortOrder,
    sortPhrases,
    sortStoredPhraseLists,
  };
});
