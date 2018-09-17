/* Highlighty.js v1.0 | by Stephen Wu | MIT License */

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.browserAction.onClicked.addListener(function(tab) {
  console.log("Hello world!");
});
