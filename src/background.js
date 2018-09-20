/* Highlighty.js v1.0 | by Stephen Wu | MIT License */

const defaultOptions = {
  highlighter: [
    {
      phrases: ["hello", "there", "facebook", "lorem ipsum"],
      title: "phrases from set 3",
      color: "black"
    }
  ],
  baseStyles: "border-radius: 0.3em; color: white; font-weight: normal; box-shadow: 1px 1px 1px 1px grey;",
  enableTitleMouseover: true,
  keyboardShortcut: 117
  // TODO: Add case sensitive setting
};

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    chrome.runtime.openOptionsPage();
    chrome.storage.local.set(defaultOptions);
  }
});

chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.sendMessage(tab.id, "highlighty");
});
