/* Highlighty.js | by Stephen Wu */

const defaultOptions = {
  highlighter: [
    {
      phrases: ['Hello there', 'welcome to', 'Highlighty!'],
      title: 'Highlighty',
      color: '#800080',
      textColor: '#ffffff',
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

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason == 'install') {
    chrome.storage.local.set(defaultOptions, () => {
      chrome.runtime.openOptionsPage();
    });
  } else {
    chrome.storage.local.get((currentOptions) => {
      /*
       * When user updates, set new, missing options to their default.
       * This ensures updates are not breaking for new options.
       * Developers should still be cautious of modifying the structure of existing options.
       */
      for (const defaultOptionName of Object.keys(defaultOptions)) {
        if (!(defaultOptionName in currentOptions)) {
          chrome.storage.local.set({ [defaultOptionName]: defaultOptions[defaultOptionName] });
        }
      }
      /**
       * If we've renamed any options, let's migrate their values to their new name.
       */
      for (const oldOptionName of Object.keys(migratedOptionsMap)) {
        if (oldOptionName in currentOptions) {
          chrome.storage.local.set({
            [migratedOptionsMap[oldOptionName]]: currentOptions[oldOptionName],
          });
          chrome.storage.local.remove(oldOptionName);
        }
      }
      /**
       * Ensure updated structure of highlighter objects
       */
      for (const highlighterIndex of currentOptions.highlighter) {
        for (const attributeName of Object.keys(defaultOptions.highlighter)) {
          if (!(attributeName in currentOptions.highlighter[highlighterIndex])) {
            chrome.storage.local.set({ highlighter: defaultOptions.highlighter });
          }
        }
      }
      /**
       * Convert any non-hex colors to hex.
       */
      currentOptions.highlighter.forEach((list) => {
        // We used purple as a default list color in the past.
        if (list.color === 'purple') {
          list.color = '#800080';
        } else if (list.color.startsWith('rgb')) {
          list.color = rgbaStringToHex(list.color);
        }
        if (list.textColor.toLowerCase() === 'white') {
          list.textColor = '#ffffff';
        } else if (list.textColor.toLowerCase() === 'black') {
          list.textColor = '#000000';
        } else if (list.textColor.startsWith('rgb')) {
          list.textColor = rgbaStringToHex(list.textColor);
        }
      });
      chrome.storage.local.set({ highlighter: currentOptions.highlighter });

      /**
       * Convert legacy keyboard shortcut options to their updated equivalents.
       */
      if (currentOptions.keyboardShortcut === -1) {
        currentOptions.keyboardShortcut = '';
      } else if (currentOptions.keyboardShortcut === 117) {
        currentOptions.keyboardShortcut = 'F6';
      }
      chrome.storage.local.set({ keyboardShortcut: currentOptions.keyboardShortcut });
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, 'highlighty');
});

/*
  Possible received messages:
  {autoHighlighter: bool}
    - update the autoHighlighter badge
  {manualHighlighter: bool, tab: bool=true}
    - updates the manualHighlighter badge, for only current tab if tab is false
  {blockedHighlighter: bool}
    - updates the blockedHighlighter badge for tab
*/
chrome.runtime.onMessage.addListener((request, sender) => {
  /*
    AutoHighlighter Mode:
      Green - on
      Red - blacklisted or not in whitelist? (TBD)
      Blue - off
    ManualHighlighter Mode:
      Yellow - tab highlighted
      Blue - tab not highlighted
  */
  if ('autoHighlighter' in request) {
    let color = request.autoHighlighter ? 'Green' : 'Blue';
    setBrowserIcon(color);
    setBrowserIcon(color, sender.tab.id); // Need to set both here or else tab doesn't get set sometimes
  } else if ('manualHighlighter' in request) {
    let color = request.manualHighlighter ? 'Yellow' : 'Blue';
    if ('tab' in request && request.tab) {
      setBrowserIcon(color, sender.tab.id);
    } else {
      setBrowserIcon(color);
    }
  } else if ('blockedHighlighter' in request) {
    setBrowserIcon('Red', sender.tab.id);
  }
});

function setBrowserIcon(color, tab = false) {
  let iconObject = {
    path: {
      16: `img/16px${color}.png`,
      24: `img/24px${color}.png`,
      32: `img/32px${color}.png`,
    },
  };
  if (tab) {
    iconObject.tabId = tab;
  }
  chrome.browserAction.setIcon(iconObject);
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
  const rgba = rgbaString
    .match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+\.{0,1}\d*))?\)$/)
    .slice(1);
  return rgbaToHex(rgba);
}
function hexClean(hex) {
  return hex.length > 7 && hex.slice(-2) === 'ff' ? hex.slice(0, 7) : hex;
}
