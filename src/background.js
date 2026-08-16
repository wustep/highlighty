/* Highlighty.js | by Stephen Wu */

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
  baseStyles:
    'display: inline; border-radius: 0.3rem; padding: 0.1rem; font-weight: normal; box-shadow: inset 0 -0.1rem 0 rgba(20,20,20,0.40);',
  autoHighlighter: false /* If enableAutoHighlight, represents whether autoHighlighter is active */,
  enableAutoHighlight: true,
  enableAutoHighlightUpdates: true,
  enableTitleMouseover: false,
  enablePartialMatch: false,
  enableCaseInsensitive: true,
  enablePhraseNavigator: false,
  enableQuickSearch: false,
  enableURLDenylist: false,
  enableURLAllowlist: false,
  /**
   * Keyboard shortcut string to activate highlighter.
   * e.g. "ctrl + shift + F5"
   */
  keyboardShortcut: 'F6',
  sorting: 'None',
};

const migratedOptionsMap = {
  whitelist: 'allowlist',
  blacklist: 'denylist',
  enableURLWhitelist: 'enableURLAllowlist',
  enableURLBlacklist: 'enableURLDenylist',
};

const actionStates = {
  autoOn: {
    color: 'Green',
    title: 'Turn off auto-highlight',
  },
  autoOff: {
    color: 'Blue',
    title: 'Turn on auto-highlight',
  },
  manualOn: {
    color: 'Yellow',
    title: 'Remove highlights from this page',
  },
  manualOff: {
    color: 'Blue',
    title: 'Highlight phrases on this page',
  },
  blocked: {
    color: 'Red',
    title: 'Highlight phrases on this blocked page',
  },
};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set(defaultOptions, () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  chrome.storage.local.get((currentOptions) => {
    const migratedOptions = { ...defaultOptions, ...currentOptions };
    const obsoleteOptionNames = [];

    for (const [oldOptionName, newOptionName] of Object.entries(migratedOptionsMap)) {
      if (oldOptionName in currentOptions) {
        migratedOptions[newOptionName] = currentOptions[oldOptionName];
        obsoleteOptionNames.push(oldOptionName);
      }
    }

    migratedOptions.highlighter = normalizePhraseLists(migratedOptions.highlighter);

    if (migratedOptions.keyboardShortcut === -1) {
      migratedOptions.keyboardShortcut = '';
    } else if (migratedOptions.keyboardShortcut === 117) {
      migratedOptions.keyboardShortcut = 'F6';
    }

    chrome.storage.local.set(migratedOptions, () => {
      if (obsoleteOptionNames.length) {
        chrome.storage.local.remove(obsoleteOptionNames);
      }
    });
  });
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) {
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: 'toggleHighlights' }, () => {
    // Restricted browser pages do not have Highlighty's content script.
    void chrome.runtime.lastError;
  });
});

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request?.type !== 'actionState' || !sender.tab?.id) {
    return;
  }

  setActionState(request.state, sender.tab.id);
});

function setActionState(stateName, tabId) {
  const state = actionStates[stateName];
  if (!state) {
    return;
  }

  const actionDetails = { tabId };
  chrome.action.setIcon(
    {
      ...actionDetails,
      path: {
        16: `img/16px${state.color}.png`,
        24: `img/24px${state.color}.png`,
        32: `img/32px${state.color}.png`,
      },
    },
    () => void chrome.runtime.lastError,
  );
  chrome.action.setTitle(
    {
      ...actionDetails,
      title: state.title,
    },
    () => void chrome.runtime.lastError,
  );
}

function normalizePhraseLists(highlighter) {
  if (!Array.isArray(highlighter)) {
    return defaultOptions.highlighter;
  }

  return highlighter
    .filter((list) => list && typeof list === 'object' && Object.keys(list).length)
    .map((list) => {
      const normalizedList = { ...list };

      if (normalizedList.color === 'purple') {
        normalizedList.color = '#800080';
      } else if (normalizedList.color?.startsWith('rgb')) {
        normalizedList.color = rgbaStringToHex(normalizedList.color);
      }

      if (normalizedList.textColor?.toLowerCase() === 'white') {
        normalizedList.textColor = '#ffffff';
      } else if (normalizedList.textColor?.toLowerCase() === 'black') {
        normalizedList.textColor = '#000000';
      } else if (normalizedList.textColor?.startsWith('rgb')) {
        normalizedList.textColor = rgbaStringToHex(normalizedList.textColor);
      }

      normalizedList.enabled =
        typeof normalizedList.enabled === 'boolean'
          ? normalizedList.enabled
          : typeof normalizedList.toggled === 'boolean'
            ? normalizedList.toggled
            : true;
      delete normalizedList.toggled;
      normalizedList.styles =
        typeof normalizedList.styles === 'string' ? normalizedList.styles : '';

      normalizedList.phrases = Array.isArray(normalizedList.phrases)
        ? normalizedList.phrases
            .filter((phrase) => typeof phrase === 'string' && phrase.trim())
            .map((phrase) => phrase.trim())
        : [];

      return normalizedList;
    });
}

/** rgbaToHex and rgbaStringToHex functions -- keep in sync with options.js **/
function rgbaToHex(rgba) {
  const hex = `#${rgba
    .map((n, i) =>
      (i === 3 ? Math.round(parseFloat(n) * 255) : parseFloat(n))
        .toString(16)
        .padStart(2, '0')
        .replace('NaN', ''),
    )
    .join('')}`;
  return hexClean(hex);
}
function rgbaStringToHex(rgbaString) {
  const match = rgbaString.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+\.{0,1}\d*))?\)$/);
  return match ? rgbaToHex(match.slice(1)) : rgbaString;
}
function hexClean(hex) {
  return hex.length > 7 && hex.slice(-2) === 'ff' ? hex.slice(0, 7) : hex;
}
