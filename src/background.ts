/* Highlighty.js | by Stephen Wu */

import { cloneDefaults, normalizeOptions } from './modules/storage';
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
  browserBlocked: {
    color: 'Red',
    title: 'Highlighty cannot run on this browser-protected page',
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

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  if (await sendToggleMessage(tab.id)) {
    clearBlockedBadge(tab.id);
    return;
  }

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id, frameIds: [0] },
      files: ['highlighty.css'],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      files: ['highlighty.js'],
    });

    if (await sendToggleMessage(tab.id)) {
      clearBlockedBadge(tab.id);
      return;
    }
  } catch {
    // Chrome rejects injection on internal pages, the Web Store, and some PDF viewer contexts.
  }

  showBrowserBlockedState(tab);
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
  clearBlockedBadge(tabId);
}

function sendToggleMessage(tabId: number): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'toggleHighlights' }, () => {
      resolve(!chrome.runtime.lastError);
    });
  });
}

function clearBlockedBadge(tabId: number): void {
  chrome.action.setBadgeText({ tabId, text: '' }, () => void chrome.runtime.lastError);
}

function showBrowserBlockedState(tab: chrome.tabs.Tab): void {
  if (!tab.id) return;

  const fileAccessHint = tab.url?.startsWith('file:')
    ? ' Enable “Allow access to file URLs” for Highlighty in chrome://extensions.'
    : '';
  setActionState('browserBlocked', tab.id);
  chrome.action.setTitle(
    {
      tabId: tab.id,
      title: `Highlighty cannot run on this page because Chrome blocks extension access.${fileAccessHint}`,
    },
    () => void chrome.runtime.lastError,
  );
  chrome.action.setBadgeBackgroundColor(
    { tabId: tab.id, color: '#bb0000' },
    () => void chrome.runtime.lastError,
  );
  chrome.action.setBadgeText({ tabId: tab.id, text: '!' }, () => void chrome.runtime.lastError);
}
