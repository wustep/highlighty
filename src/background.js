/* Highlighty.js v1.0 | by Stephen Wu | MIT License */

const defaultOptions = {
  highlighter: [
    {
      phrases: ["hello", "there", "facebook", "lorem ipsum"],
      title: "phrases from set 3",
      color: "black"
    }
  ],
  baseStyles: "border-radius: 0.3rem; padding: 0.05rem; color: white; font-weight: normal; box-shadow: 1px 1px 1px 1px grey;",
  enableTitleMouseover: true,
  enablePartialMatch: true,
  enableCaseInsensitive: true,
  keyboardShortcut: 117
  // TODO: [Low] Add alphabetization of list setting
  // TODO: [Low] Add crossElements checkbox to have mark.js go across elements
  // TODO: [Med] Add whitelist/blacklist
  // TODO: [High] Add auto-highlight enable
};

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    chrome.runtime.openOptionsPage();
    chrome.storage.local.set(defaultOptions);
  } else {
    // When user updates, set new, missing options to their default.
    chrome.storage.local.get(function(currentOptions) {
      let changed = false;
      for (let option of Object.keys(defaultOptions)) {
        if (!(option in currentOptions)) {
          changed = true;
          currentOptions[option] = defaultOptions[option];
        }
      }
      if (changed) {
        chrome.storage.local.set(option, defaultOptions[option]);
      }
    });
  }
});

chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.sendMessage(tab.id, "highlighty");
});
