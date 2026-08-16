/* Highlighty.js | by Stephen Wu */

importScripts(
  'modules/styles.js',
  'modules/colors.js',
  'modules/phrase-lists.js',
  'modules/urls.js',
  'modules/storage.js',
);

const { cloneDefaults, normalizeOptions } = HighlightyCore;
const obsoleteOptionNames = ['whitelist', 'blacklist', 'enableURLWhitelist', 'enableURLBlacklist'];

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
    chrome.storage.local.set(cloneDefaults(), () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  chrome.storage.local.get((currentOptions) => {
    const migratedOptions = normalizeOptions(currentOptions);

    chrome.storage.local.set(migratedOptions, () => {
      chrome.storage.local.remove(obsoleteOptionNames);
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
