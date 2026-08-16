const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);

export function shortcutFromKeyboardEvent(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>,
): string {
  const pressedKeys: string[] = [];
  if (event.ctrlKey) pressedKeys.push('ctrl');
  if (event.shiftKey) pressedKeys.push('shift');
  if (event.altKey) pressedKeys.push('alt');
  if (event.metaKey) pressedKeys.push('meta');

  let key = MODIFIER_KEYS.has(event.key) ? '' : event.key === ' ' ? 'space' : event.key;
  if (key.length < 2) key = key.toLowerCase();
  if (key) pressedKeys.push(key);
  return pressedKeys.join(' + ').trim();
}

export function isEditableTarget(target: EventTarget | null | object): boolean {
  if (!target || typeof target !== 'object') return false;
  const editable = target as { isContentEditable?: boolean; tagName?: string };
  return Boolean(
    editable.isContentEditable ||
    (editable.tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(editable.tagName)),
  );
}
