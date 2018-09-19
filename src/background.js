/* Highlighty.js v1.0 | by Stephen Wu | MIT License */

const defaultOptions = {
  highlighter: [
    {
      words: ["hello", "there", "facebook"],
      context: "words from set 3",
      color: "black"
    }
  ],
  baseStyles: "border-radius: 0.3em; color: white; font-weight: normal; box-shadow: 1px 1px 1px 1px grey;",
  enableContextMouseover: true
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
