/* Highlighty.js | by Stephen Wu */

const defaultOptions = {
  highlighter: [
    {
      phrases: ["Hello there", "welcome to", "Highlighty!"],
      title: "Highlighty",
      color: "purple"
    }
  ],
  baseStyles: "border-radius: 0.3rem; padding: 0.05rem; color: white; font-weight: normal; box-shadow: 1px 1px 1px 1px grey;",
  enableTitleMouseover: true,
  enablePartialMatch: true,
  enableCaseInsensitive: true,
  keyboardShortcut: 117
  // TODO: [Low] Add auto-alphabetization of list setting
  // TODO: [Low] Add crossElements checkbox to have mark.js go across elements?
  // TODO: [Med] Add whitelist/blacklist
  // TODO: [High] Add auto-highlight enable
};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason == "install") {
    chrome.runtime.openOptionsPage();
    chrome.storage.local.set(defaultOptions);
  } else {
    /*
      When user updates, set new, missing options to their default.
      This ensures updates are not breaking for new options.
      Developers should still be cautious of modifying the structure of existing options.
    */
    chrome.storage.local.get((currentOptions) => {
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

chrome.browserAction.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, "highlighty");
});
