(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HighlightyCore = Object.assign(root.HighlightyCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function validateStyleDeclarations(styles) {
    return (
      typeof styles === 'string' &&
      !/[{}<>]|\/\*|\*\/|@import|url\s*\(|expression\s*\(/i.test(styles)
    );
  }

  function normalizeStyleDeclarations(styles) {
    return validateStyleDeclarations(styles) ? styles.trim() : '';
  }

  return { normalizeStyleDeclarations, validateStyleDeclarations };
});
