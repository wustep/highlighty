import { getTextColor, hexClean, rgbaStringToHex } from './colors';
import { normalizeShortcut } from './keyboard';
import { normalizeListEnabled, normalizePhrases, normalizeSortOrder } from './phrase-lists';
import { normalizeStyleDeclarations, validateStyleDeclarations } from './styles';
import type { HighlightyOptions, PhraseList, StoredOptions } from './types';
import { normalizeURLPhrases } from './urls';

export const DEFAULT_BASE_STYLES =
  'display: inline; border-radius: 0.3rem; padding: 0.1rem; font-weight: normal; box-shadow: inset 0 -0.1rem 0 rgba(20,20,20,0.40);';

export const defaultOptions: HighlightyOptions = {
  highlighter: [
    {
      phrases: ['Hello there', 'welcome to', 'Highlighty!'],
      title: 'Highlighty',
      color: '#800080',
      textColor: '#ffffff',
      enabled: true,
      styles: '',
      allowlist: [],
      denylist: [],
    },
  ],
  allowlist: [],
  denylist: [],
  baseStyles: DEFAULT_BASE_STYLES,
  autoHighlighter: false,
  enableAutoHighlight: true,
  enableAutoHighlightUpdates: true,
  enableTitleMouseover: false,
  enablePartialMatch: false,
  enableCaseInsensitive: true,
  enablePhraseNavigator: false,
  enableQuickSearch: false,
  enableURLDenylist: false,
  enableURLAllowlist: false,
  keyboardShortcut: 'F6',
  sorting: 'None',
};

export function cloneDefaults(): HighlightyOptions {
  return {
    ...defaultOptions,
    highlighter: defaultOptions.highlighter.map((list) => ({
      ...list,
      phrases: [...list.phrases],
      allowlist: [...list.allowlist],
      denylist: [...list.denylist],
    })),
    allowlist: [],
    denylist: [],
  };
}

export function normalizePhraseList(list: Record<string, unknown>): PhraseList {
  let color = typeof list.color === 'string' ? list.color : '#000000';
  if (color.toLowerCase() === 'purple') color = '#800080';
  else if (color.startsWith('rgb')) color = rgbaStringToHex(color);
  if (!/^#[a-f\d]{6}(?:[a-f\d]{2})?$/i.test(color)) color = '#000000';

  let textColor = typeof list.textColor === 'string' ? list.textColor : getTextColor(color);
  if (textColor.toLowerCase() === 'white') textColor = '#ffffff';
  else if (textColor.toLowerCase() === 'black') textColor = '#000000';
  else if (textColor.startsWith('rgb')) textColor = rgbaStringToHex(textColor);
  if (!/^#[a-f\d]{6}(?:[a-f\d]{2})?$/i.test(textColor)) {
    textColor = getTextColor(color);
  }

  return {
    ...list,
    title: typeof list.title === 'string' && list.title.trim() ? list.title : 'Untitled',
    color: hexClean(color),
    textColor: hexClean(textColor),
    enabled: normalizeListEnabled(list),
    styles: normalizeStyleDeclarations(list.styles || ''),
    phrases: normalizePhrases(list.phrases),
    allowlist: normalizeURLPhrases(list.allowlist),
    denylist: normalizeURLPhrases(list.denylist),
    toggled: undefined,
  } as PhraseList;
}

export function normalizePhraseLists(highlighter: unknown): PhraseList[] {
  if (!Array.isArray(highlighter)) return cloneDefaults().highlighter;
  return highlighter
    .filter(
      (list) =>
        list && typeof list === 'object' && !Array.isArray(list) && Object.keys(list).length > 0,
    )
    .map((list) => normalizePhraseList(list as Record<string, unknown>))
    .map((list) => {
      delete list.toggled;
      return list;
    });
}

export function normalizeOptions(storedOptions: unknown = {}): HighlightyOptions {
  const stored = (
    storedOptions && typeof storedOptions === 'object' && !Array.isArray(storedOptions)
      ? storedOptions
      : {}
  ) as StoredOptions & Record<string, unknown>;
  const options = { ...cloneDefaults(), ...stored } as HighlightyOptions & StoredOptions;

  if (!('allowlist' in stored) && Array.isArray(stored.whitelist)) {
    options.allowlist = stored.whitelist;
  }
  if (!('denylist' in stored) && Array.isArray(stored.blacklist)) {
    options.denylist = stored.blacklist;
  }
  if (!('enableURLAllowlist' in stored) && 'enableURLWhitelist' in stored) {
    options.enableURLAllowlist = Boolean(stored.enableURLWhitelist);
  }
  if (!('enableURLDenylist' in stored) && 'enableURLBlacklist' in stored) {
    options.enableURLDenylist = Boolean(stored.enableURLBlacklist);
  }

  options.highlighter = normalizePhraseLists(options.highlighter);
  options.allowlist = normalizeURLPhrases(options.allowlist);
  options.denylist = normalizeURLPhrases(options.denylist);
  options.sorting = normalizeSortOrder(options.sorting);
  options.baseStyles = validateStyleDeclarations(options.baseStyles)
    ? options.baseStyles.trim()
    : DEFAULT_BASE_STYLES;
  for (const optionName of [
    'autoHighlighter',
    'enableAutoHighlight',
    'enableAutoHighlightUpdates',
    'enableTitleMouseover',
    'enablePartialMatch',
    'enableCaseInsensitive',
    'enablePhraseNavigator',
    'enableQuickSearch',
    'enableURLDenylist',
    'enableURLAllowlist',
  ]) {
    if (typeof options[optionName] !== 'boolean') {
      options[optionName] = defaultOptions[optionName];
    }
  }

  const keyboardShortcut: unknown = stored.keyboardShortcut ?? options.keyboardShortcut;
  if (keyboardShortcut === -1) options.keyboardShortcut = '';
  else if (keyboardShortcut === 117) options.keyboardShortcut = 'F6';
  else if (typeof keyboardShortcut !== 'string') {
    options.keyboardShortcut = defaultOptions.keyboardShortcut;
  } else {
    options.keyboardShortcut = normalizeShortcut(keyboardShortcut);
  }

  return options;
}
