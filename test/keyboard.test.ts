const test = require('node:test');
const assert = require('node:assert/strict');

export {};

const {
  formatShortcut,
  isEditableTarget,
  isLikelyReservedShortcut,
  normalizeShortcut,
  parseShortcut,
  shortcutFromKeyboardEvent,
  shortcutMatchesEvent,
} = require('../src/modules/keyboard.ts');

function keyboardEvent(overrides = {}) {
  return {
    key: 'h',
    code: 'KeyH',
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...overrides,
  };
}

test('shortcuts parse aliases and normalize modifier order and casing', () => {
  assert.equal(normalizeShortcut('SHIFT + control + h'), 'Ctrl+Shift+H');
  assert.equal(normalizeShortcut('Win + option + ArrowLeft'), 'Alt+Meta+ArrowLeft');
  assert.equal(normalizeShortcut('cmd + digit7'), 'Meta+7');
  assert.equal(formatShortcut(parseShortcut('ctrl + F12')), 'Ctrl+F12');
});

test('invalid and modifier-only shortcuts are rejected', () => {
  assert.equal(parseShortcut('Ctrl+Shift'), null);
  assert.equal(parseShortcut('Ctrl+H+J'), null);
  assert.equal(parseShortcut('Ctrl+Mystery'), null);
  assert.equal(normalizeShortcut(''), '');
});

test('keyboard events use physical codes instead of shifted or localized keys', () => {
  assert.equal(
    shortcutFromKeyboardEvent(
      keyboardEvent({ key: 'H', code: 'KeyH', ctrlKey: true, shiftKey: true }),
    ),
    'Ctrl+Shift+H',
  );
  assert.equal(
    shortcutFromKeyboardEvent(
      keyboardEvent({ key: '!', code: 'Digit1', ctrlKey: true, shiftKey: true }),
    ),
    'Ctrl+Shift+1',
  );
  assert.equal(
    shortcutFromKeyboardEvent(keyboardEvent({ key: ' ', code: 'Space', altKey: true })),
    'Alt+Space',
  );
  assert.equal(shortcutFromKeyboardEvent(keyboardEvent({ key: 'F6', code: 'F6' })), 'F6');
  assert.equal(shortcutFromKeyboardEvent(keyboardEvent({ key: 'Shift', code: 'ShiftLeft' })), '');
});

test('event matching accepts normalized legacy aliases but requires exact modifiers and code', () => {
  const event = keyboardEvent({ key: 'H', ctrlKey: true, shiftKey: true });
  assert.equal(shortcutMatchesEvent('shift + CONTROL + h', event), true);
  assert.equal(shortcutMatchesEvent('Ctrl+H', event), false);
  assert.equal(shortcutMatchesEvent('Ctrl+Shift+A', event), false);
});

test('legacy event.key punctuation normalizes to the corresponding physical key', () => {
  assert.equal(normalizeShortcut('ctrl + shift + !'), 'Ctrl+Shift+1');
  assert.equal(normalizeShortcut('control + spacebar'), 'Ctrl+Space');
  assert.equal(normalizeShortcut('cmd + esc'), 'Meta+Escape');
});

test('common browser-reserved combinations are identified for warnings', () => {
  assert.equal(isLikelyReservedShortcut('Ctrl+L'), true);
  assert.equal(isLikelyReservedShortcut('Meta+Shift+T'), true);
  assert.equal(isLikelyReservedShortcut('Alt+ArrowLeft'), true);
  assert.equal(isLikelyReservedShortcut('Ctrl+Shift+H'), false);
});

test('editable targets and their descendants are ignored case-insensitively', () => {
  assert.equal(isEditableTarget({ tagName: 'input' }), true);
  assert.equal(isEditableTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(isEditableTarget({ tagName: 'select' }), true);
  assert.equal(isEditableTarget({ tagName: 'DIV', contentEditable: 'true' }), true);
  assert.equal(
    isEditableTarget({
      tagName: 'SPAN',
      parentElement: { tagName: 'DIV', isContentEditable: true },
    }),
    true,
  );
  assert.equal(isEditableTarget({ tagName: 'BUTTON', isContentEditable: false }), false);
});
