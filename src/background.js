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
  autoHighlighter: true, /* If enableAutoHighlight, represents whether autoHighlighter is active */
  enableAutoHighlight: false,
  enableTitleMouseover: true,
  enablePartialMatch: true,
  enableCaseInsensitive: true,
  keyboardShortcut: 117
};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason == "install") {
    chrome.storage.local.set(defaultOptions, () => {
      chrome.runtime.openOptionsPage();
    });
  } else {
    /*
      When user updates, set new, missing options to their default.
      This ensures updates are not breaking for new options.
      Developers should still be cautious of modifying the structure of existing options.
    */
    chrome.storage.local.get((currentOptions) => {
      for (let option of Object.keys(defaultOptions)) {
        if (!(option in currentOptions)) {
          chrome.storage.local.set(option, defaultOptions[option]);
        }
      }
    });
  }
});

chrome.browserAction.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, "highlighty");
});

/*
  Possible received messages:
  {autoHighlighter: bool}
    - update the autoHighlighter badge
  {manualHighlighter: bool, tab: bool=true}
    - updates the manualHighlighter badge, for tab if true, otherwise all tabs
*/
chrome.runtime.onMessage.addListener((request, sender) => {
  /*
    AutoHighlighter Mode:
      Green - on
      Black - blacklisted or not in whitelist? (TBD)
      Red - off
    ManualHighlighter Mode:
      Yellow - tab highlighted
      none - tab not highlighted
  */
  if ("autoHighlighter" in request) {
    chrome.browserAction.setBadgeText({text: " "});
    chrome.browserAction.setBadgeBackgroundColor({color: (request.autoHighlighter) ? "green" : "red"});
    chrome.browserAction.setBadgeBackgroundColor(badgeColor);
  } else if ("manualHighlighter" in request) {
    let badgeText = {text: (request.manualHighlighter) ? " " : ""};
    if (!"tab" in request || request.tab) {
      badgeText.tabId = sender.tab.id;
    }
    chrome.browserAction.setBadgeText(badgeText);
    chrome.browserAction.setBadgeBackgroundColor({color: "yellow"});
  }
});
