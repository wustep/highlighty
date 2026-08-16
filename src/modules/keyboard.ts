const MODIFIER_KEYS = new Set([
  'alt',
  'altgraph',
  'command',
  'control',
  'ctrl',
  'cmd',
  'meta',
  'option',
  'os',
  'shift',
  'super',
  'win',
  'windows',
]);

const MODIFIER_ALIASES: Record<string, 'ctrl' | 'alt' | 'shift' | 'meta'> = {
  control: 'ctrl',
  ctrl: 'ctrl',
  alt: 'alt',
  option: 'alt',
  shift: 'shift',
  command: 'meta',
  cmd: 'meta',
  meta: 'meta',
  os: 'meta',
  super: 'meta',
  win: 'meta',
  windows: 'meta',
};

const CODE_LABELS: Record<string, string> = {
  Space: 'Space',
  Escape: 'Escape',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Comma: ',',
  Period: '.',
  Slash: '/',
  NumpadAdd: 'NumpadAdd',
  NumpadSubtract: 'NumpadSubtract',
  NumpadMultiply: 'NumpadMultiply',
  NumpadDivide: 'NumpadDivide',
  NumpadDecimal: 'NumpadDecimal',
  NumpadEnter: 'NumpadEnter',
  ControlLeft: '',
  ControlRight: '',
  ShiftLeft: '',
  ShiftRight: '',
  AltLeft: '',
  AltRight: '',
  MetaLeft: '',
  MetaRight: '',
};

const LABEL_CODES = new Map<string, string>();
for (const [code, label] of Object.entries(CODE_LABELS)) {
  if (label) LABEL_CODES.set(label.toLowerCase(), code);
}
for (let index = 0; index <= 9; index++) {
  LABEL_CODES.set(String(index), `Digit${index}`);
  LABEL_CODES.set(`digit${index}`, `Digit${index}`);
  LABEL_CODES.set(`numpad${index}`, `Numpad${index}`);
}
for (let index = 1; index <= 24; index++) LABEL_CODES.set(`f${index}`, `F${index}`);
for (let index = 0; index < 26; index++) {
  const letter = String.fromCharCode(65 + index);
  LABEL_CODES.set(letter.toLowerCase(), `Key${letter}`);
  LABEL_CODES.set(`key${letter}`.toLowerCase(), `Key${letter}`);
}

const SHIFTED_CHARACTER_CODES: Record<string, string> = {
  '!': 'Digit1',
  '@': 'Digit2',
  '#': 'Digit3',
  $: 'Digit4',
  '%': 'Digit5',
  '^': 'Digit6',
  '&': 'Digit7',
  '*': 'Digit8',
  '(': 'Digit9',
  ')': 'Digit0',
  _: 'Minus',
  '+': 'Equal',
  '{': 'BracketLeft',
  '}': 'BracketRight',
  '|': 'Backslash',
  ':': 'Semicolon',
  '"': 'Quote',
  '~': 'Backquote',
  '<': 'Comma',
  '>': 'Period',
  '?': 'Slash',
};

export interface Shortcut {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  code: string;
}

export type KeyboardShortcutEvent = Pick<
  KeyboardEvent,
  'key' | 'code' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'
>;

function codeFromLabel(label: string): string | null {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return null;
  if (LABEL_CODES.has(normalized)) return LABEL_CODES.get(normalized);
  if (SHIFTED_CHARACTER_CODES[label]) return SHIFTED_CHARACTER_CODES[label];
  const aliases: Record<string, string> = {
    esc: 'Escape',
    return: 'Enter',
    spacebar: 'Space',
    space: 'Space',
    del: 'Delete',
    ins: 'Insert',
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
  };
  return aliases[normalized] || null;
}

function labelFromCode(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return code;
  if (/^F(?:[1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
  return code in CODE_LABELS ? CODE_LABELS[code] || null : null;
}

export function parseShortcut(value: unknown): Shortcut | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  // Legacy event.key recordings represented the Equal key as a trailing "+".
  const normalizedValue = value.trim().endsWith('+') ? `${value.trim().slice(0, -1)}=` : value;
  const shortcut: Shortcut = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    code: '',
  };
  const parts = normalizedValue
    .split(/\s*\+\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  for (const part of parts) {
    const normalizedPart = part.toLowerCase();
    const modifier = MODIFIER_ALIASES[normalizedPart];
    if (modifier) {
      shortcut[modifier] = true;
      continue;
    }
    if (MODIFIER_KEYS.has(normalizedPart) || shortcut.code) return null;
    const code = codeFromLabel(part);
    if (!code) return null;
    shortcut.code = code;
  }
  return shortcut.code ? shortcut : null;
}

export function formatShortcut(shortcut: Shortcut | null): string {
  if (!shortcut?.code) return '';
  const label = labelFromCode(shortcut.code);
  if (!label) return '';
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.meta) parts.push('Meta');
  parts.push(label);
  return parts.join('+');
}

export function normalizeShortcut(value: unknown): string {
  return formatShortcut(parseShortcut(value));
}

export function shortcutFromKeyboardEvent(event: KeyboardShortcutEvent): string {
  const key = event.key || '';
  const code =
    labelFromCode(event.code) !== null
      ? event.code
      : codeFromLabel(key === ' ' ? 'Space' : key) || '';
  if (!code || MODIFIER_KEYS.has(key.toLowerCase())) return '';
  return formatShortcut({
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
    code,
  });
}

export function shortcutMatchesEvent(value: unknown, event: KeyboardShortcutEvent): boolean {
  const expected = parseShortcut(value);
  return Boolean(expected && shortcutFromKeyboardEvent(event) === formatShortcut(expected));
}

export function isLikelyReservedShortcut(value: unknown): boolean {
  const shortcut = parseShortcut(value);
  if (!shortcut) return false;
  const primaryModifier = shortcut.ctrl || shortcut.meta;
  return (
    (primaryModifier &&
      ['KeyL', 'KeyN', 'KeyR', 'KeyT', 'KeyW'].includes(shortcut.code) &&
      !shortcut.alt) ||
    (shortcut.alt && ['ArrowLeft', 'ArrowRight'].includes(shortcut.code)) ||
    (!shortcut.ctrl && !shortcut.alt && !shortcut.shift && !shortcut.meta && shortcut.code === 'F5')
  );
}

export function isEditableTarget(target: EventTarget | null | object): boolean {
  let current: unknown = target;
  while (current && typeof current === 'object') {
    const editable = current as {
      isContentEditable?: boolean;
      contentEditable?: string;
      tagName?: string;
      parentElement?: object | null;
    };
    const tagName = editable.tagName?.toUpperCase();
    if (
      editable.isContentEditable ||
      editable.contentEditable === 'true' ||
      (tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName))
    ) {
      return true;
    }
    current = editable.parentElement;
  }
  return false;
}
