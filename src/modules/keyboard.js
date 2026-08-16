(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HighlightyCore = Object.assign(root.HighlightyCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);

  function shortcutFromKeyboardEvent(event) {
    const pressedKeys = [];
    if (event.ctrlKey) pressedKeys.push('ctrl');
    if (event.shiftKey) pressedKeys.push('shift');
    if (event.altKey) pressedKeys.push('alt');
    if (event.metaKey) pressedKeys.push('meta');

    let key = MODIFIER_KEYS.has(event.key) ? '' : event.key === ' ' ? 'space' : event.key;
    if (key.length < 2) key = key.toLowerCase();
    if (key) pressedKeys.push(key);
    return pressedKeys.join(' + ').trim();
  }

  return { shortcutFromKeyboardEvent };
});
