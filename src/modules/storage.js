(function (root, factory) {
  const dependencies =
    typeof module === 'object' && module.exports
      ? {
          ...require('./colors.js'),
          ...require('./phrase-lists.js'),
          ...require('./styles.js'),
          ...require('./urls.js'),
        }
      : root.HighlightyCore;
  const api = factory(dependencies);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HighlightyCore = Object.assign(root.HighlightyCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
  const DEFAULT_BASE_STYLES =
    'display: inline; border-radius: 0.3rem; padding: 0.1rem; font-weight: normal; box-shadow: inset 0 -0.1rem 0 rgba(20,20,20,0.40);';

  const defaultOptions = {
    highlighter: [
      {
        phrases: ['Hello there', 'welcome to', 'Highlighty!'],
        title: 'Highlighty',
        color: '#800080',
        textColor: '#ffffff',
        enabled: true,
        styles: '',
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

  function cloneDefaults() {
    return {
      ...defaultOptions,
      highlighter: defaultOptions.highlighter.map((list) => ({
        ...list,
        phrases: [...list.phrases],
      })),
      allowlist: [],
      denylist: [],
    };
  }

  function normalizePhraseList(list) {
    let color = typeof list.color === 'string' ? list.color : '#000000';
    if (color.toLowerCase() === 'purple') color = '#800080';
    else if (color.startsWith('rgb')) color = core.rgbaStringToHex(color);
    if (!/^#[a-f\d]{6}(?:[a-f\d]{2})?$/i.test(color)) color = '#000000';

    let textColor = typeof list.textColor === 'string' ? list.textColor : core.getTextColor(color);
    if (textColor.toLowerCase() === 'white') textColor = '#ffffff';
    else if (textColor.toLowerCase() === 'black') textColor = '#000000';
    else if (textColor.startsWith('rgb')) textColor = core.rgbaStringToHex(textColor);
    if (!/^#[a-f\d]{6}(?:[a-f\d]{2})?$/i.test(textColor)) {
      textColor = core.getTextColor(color);
    }

    return {
      ...list,
      title: typeof list.title === 'string' && list.title.trim() ? list.title.trim() : 'Untitled',
      color: core.hexClean(color),
      textColor: core.hexClean(textColor),
      enabled: core.normalizeListEnabled(list),
      styles: core.normalizeStyleDeclarations(list.styles || ''),
      phrases: core.normalizePhrases(list.phrases),
      toggled: undefined,
    };
  }

  function normalizePhraseLists(highlighter) {
    if (!Array.isArray(highlighter)) return cloneDefaults().highlighter;
    return highlighter
      .filter(
        (list) =>
          list && typeof list === 'object' && !Array.isArray(list) && Object.keys(list).length > 0,
      )
      .map(normalizePhraseList)
      .map((list) => {
        delete list.toggled;
        return list;
      });
  }

  function normalizeOptions(storedOptions = {}) {
    const stored =
      storedOptions && typeof storedOptions === 'object' && !Array.isArray(storedOptions)
        ? storedOptions
        : {};
    const options = { ...cloneDefaults(), ...stored };

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
    options.allowlist = core.normalizeURLPhrases(options.allowlist);
    options.denylist = core.normalizeURLPhrases(options.denylist);
    options.sorting = core.normalizeSortOrder(options.sorting);
    options.baseStyles = core.validateStyleDeclarations(options.baseStyles)
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

    if (options.keyboardShortcut === -1) options.keyboardShortcut = '';
    else if (options.keyboardShortcut === 117) options.keyboardShortcut = 'F6';
    else if (typeof options.keyboardShortcut !== 'string') {
      options.keyboardShortcut = defaultOptions.keyboardShortcut;
    }

    return options;
  }

  return {
    DEFAULT_BASE_STYLES,
    cloneDefaults,
    defaultOptions,
    normalizeOptions,
    normalizePhraseList,
    normalizePhraseLists,
  };
});
