/* Highlighty.js | by Stephen Wu */

const defaultOptions = {
  highlighter: [
    {
      phrases: ["Hello there", "welcome to", "Highlighty!"],
      title: "Highlighty",
      color: "purple",
      textColor: "white"
    }
  ],
  blacklist: [],
  whitelist: [],
  baseStyles: "display: inline; border-radius: 0.3rem; padding: 0.1rem; font-weight: normal; box-shadow: inset 0 -0.1rem 0 rgba(20,20,20,0.40);",
  autoHighlighter: false, /* If enableAutoHighlight, represents whether autoHighlighter is active */
  enableAutoHighlight: true,
  enableAutoHighlightUpdates: true,
  enableTitleMouseover: false,
  enablePartialMatch: false,
  enableCaseInsensitive: true,
  enableURLBlacklist: false,
  enableURLWhitelist: false,
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
  if ("autoHighlighter" in request) {
    let color = (request.autoHighlighter) ? "Green" : "Blue";
    setBrowserIcon(color);
    setBrowserIcon(color, sender.tab.id); // Need to set both here or else tab doesn't get set sometimes
  } else if ("manualHighlighter" in request) {
    let color = (request.manualHighlighter) ? "Yellow" : "Blue";
    if ("tab" in request && request.tab) {
      setBrowserIcon(color, sender.tab.id);
    } else {
      setBrowserIcon(color);
    }
  } else if ("blockedHighlighter" in request) {
    setBrowserIcon("Red", sender.tab.id);
  }
});

function setBrowserIcon(color, tab=false) {
  let iconObject = {
      path: {
        "16": `img/16px${color}.png`,
        "24": `img/24px${color}.png`,
        "32": `img/32px${color}.png`
      }
    };
  if (tab) {
    iconObject.tabId = tab;
  }
  chrome.browserAction.setIcon(iconObject);
}
