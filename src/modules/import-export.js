(function (root, factory) {
  const dependencies =
    typeof module === 'object' && module.exports
      ? {
          ...require('./colors.js'),
          ...require('./phrase-lists.js'),
          ...require('./styles.js'),
        }
      : root.HighlightyCore;
  const api = factory(dependencies);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HighlightyCore = Object.assign(root.HighlightyCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
  function getDelimitedPhrases(body, format) {
    if (typeof body !== 'string') return [];
    if (format === 'Space-Delimited') return body.match(/\S+/g) || [];
    return body
      .split(/\r?\n/)
      .map((phrase) => phrase.trim())
      .filter(Boolean);
  }

  function parseBulkImport(importBody) {
    if (typeof importBody !== 'string' || !importBody.trim()) {
      throw new Error('Nothing to import.');
    }

    let parsedLists;
    try {
      parsedLists = JSON.parse(importBody);
    } catch {
      throw new Error('Imported contents are not valid JSON.');
    }
    if (!Array.isArray(parsedLists) || parsedLists.length === 0) {
      throw new Error('Imported contents must be a non-empty array of phrase lists.');
    }

    return parsedLists.map((phraseList, index) => {
      if (!phraseList || typeof phraseList !== 'object' || Array.isArray(phraseList)) {
        throw new Error(`List ${index + 1} must be an object.`);
      }
      if (typeof phraseList.title !== 'string' || !phraseList.title.trim()) {
        throw new Error(`List ${index + 1} must have a non-empty "title" string.`);
      }
      if (
        typeof phraseList.color !== 'string' ||
        !/^#[a-f\d]{6}(?:[a-f\d]{2})?$/i.test(phraseList.color)
      ) {
        throw new Error(`List ${index + 1} must have a hex color such as "#ffffff".`);
      }
      if (!Array.isArray(phraseList.phrases)) {
        throw new Error(`List ${index + 1} must have a "phrases" array.`);
      }
      if (phraseList.phrases.some((phrase) => typeof phrase !== 'string')) {
        throw new Error(`Every phrase in list ${index + 1} must be a string.`);
      }
      if ('enabled' in phraseList && typeof phraseList.enabled !== 'boolean') {
        throw new Error(`List ${index + 1} must have a boolean "enabled" value.`);
      }
      if ('toggled' in phraseList && typeof phraseList.toggled !== 'boolean') {
        throw new Error(`List ${index + 1} must have a boolean legacy "toggled" value.`);
      }
      if ('styles' in phraseList && typeof phraseList.styles !== 'string') {
        throw new Error(`List ${index + 1} must have a string "styles" value.`);
      }
      if ('styles' in phraseList && !core.validateStyleDeclarations(phraseList.styles)) {
        throw new Error(`List ${index + 1} has unsafe CSS declarations in "styles".`);
      }

      return {
        color: core.hexClean(phraseList.color),
        phrases: core.normalizePhrases(phraseList.phrases),
        textColor: core.getTextColor(phraseList.color),
        title: phraseList.title.trim(),
        enabled: core.normalizeListEnabled(phraseList),
        styles: (phraseList.styles || '').trim(),
      };
    });
  }

  return { getDelimitedPhrases, parseBulkImport };
});
