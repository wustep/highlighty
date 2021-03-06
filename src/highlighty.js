/* Highlighty.js | by Stephen Wu */

$(function() {

  if (window.top != window.self) { // Don't run on frames or iframes
    return;
  }

  const HL_PREFIX_CLASS = "Highlighty__phrase--"; // Phrases will have class prefixed with their list numbe
  const HL_BASE_CLASS = "Highlighty__phrase";     // Phrases will all have this class
  const HL_STYLE_ID = "Highlighty__styles";       // Style block containing highlighter styles

  let bodyHighlighted = false;
  let urlBlacklisted = false;
  let urlWhitelisted = false;
  let phrasesToHighlight = [];    // Array of arrays of phrases, where index represents the phrase list number.

  const MUTATION_TIMER = 3000;    // Number of miliseconds between updating body after DOM change
  let mutationTime = true;        // Whether to auto-highlight immediately after DOM change
  let mutationDelayTime = true;  // Whether to auto-highlight after a delay due to subsequent DOM changes.

  let developerMode = !('update_url' in chrome.runtime.getManifest());       // Whether to log messages to track perf

  function log(stuff) {
    if (developerMode) {
      const now = new Date();
      const logPrefix = "[Highlighty] [" + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + "." + now.getMilliseconds() + "]";
      if (typeof stuff === "string") {
        console.log(logPrefix + " " + stuff);
      } else {
        console.log(logPrefix);
        console.log(stuff);
      }
    }
  }

  // Setup phrase list and append proper styles
  // We don't re-setup the highlighter on incremental auto-updates but we do on manual triggers
  function setupHighlighter(options) {
    log("setupHighligher start");
    phrasesToHighlight = [];
    let highlighterStyles = `<style id="${HL_STYLE_ID}">.${HL_BASE_CLASS} { ${options.baseStyles} } `;
    for (i in options.highlighter) {
      if (Object.keys(options.highlighter[i]).length) { // Skip deleted lists!
        let highlighterColor = options.highlighter[i].color || "black";
        let textColor = options.highlighter[i].textColor || "white";
        highlighterStyles += `.${HL_PREFIX_CLASS + i} { background-color: ${highlighterColor}; color: ${textColor}; }\r\n`;
        for (phrase of options.highlighter[i].phrases) {
          addHighlightPhrase(phrase, i);
        }
      }
    }
    highlighterStyles += "</style>";
    $("head").append(highlighterStyles);
    log(phrasesToHighlight);
    log("setupHighligher end");
  }

  // Add phrase to highlight list given phrase and its list index
  function addHighlightPhrase(highlightPhrase, listNumber) {
    highlightPhrase = String(highlightPhrase);
    if (phrasesToHighlight[listNumber]) {
      phrasesToHighlight[listNumber].push(highlightPhrase);
    } else {
      phrasesToHighlight[listNumber] = [highlightPhrase];
    }
  }

  // Highlight phrases in body
  function highlightPhrases(options) {
    log("highlightPhrases start");
    for (let phraseListIndex in phrasesToHighlight) {
      log("highlightPhrases " + phraseListIndex)
      let markClasses = `${HL_BASE_CLASS} ${HL_PREFIX_CLASS}${phraseListIndex}`;
      let hilitor = new Hilitor();
      hilitor.applyPhrases(phrasesToHighlight[phraseListIndex], {
        classes: markClasses,
        caseSensitive: !options.enableCaseInsensitive,
        partialMatch: options.enablePartialMatch
      });
    }
    if (options.enableTitleMouseover) {
      log("enableTitleMousever start");
      for (let i = 0; i < options.highlighter.length; i++) {
        if ("title" in options.highlighter[i]) {
          $("." + HL_PREFIX_CLASS + i).attr("title", options.highlighter[i].title);
        }
      }
      log("enableTitleMousever end");
    }
    bodyHighlighted = true;
    log("highlightPhrases end");
  }

  function removeHighlightStyles() {
    $("#" + HL_STYLE_ID).remove();
  }

  // Remove all highlights (from Hilitor code!)
  function removeHighlights() {
    let arr = document.getElementsByClassName(HL_BASE_CLASS);
    // Remove the wrapping Highlighty span.
    while (arr.length && (mark = arr[0])) {
      let parent = mark.parentNode;
      parent.replaceChild(mark.firstChild, mark);
      parent.normalize();
    }
  }

  function processHighlights(manualTrigger=false) {
    log("processHighlights");
    chrome.storage.local.get((options) => {
      if (!manualTrigger && !isAllowedURL(options)) {
        chrome.runtime.sendMessage({blockedHighlighter: true});
      } else { // Let a manualTrigger override blacklist and go directly to highlight mode.
        // Deal with badges, notifying background.js.
        if (!options.enableAutoHighlight) {
          chrome.runtime.sendMessage({manualHighlighter: !bodyHighlighted, tab: true});
        } else if (manualTrigger) {
          let newAutoHighlighter = (!isAllowedURL(options)) ? true : !options.autoHighlighter;
          urlBlacklisted = false;
          urlWhitelisted = true;
          chrome.storage.local.set({"autoHighlighter": newAutoHighlighter});
          chrome.runtime.sendMessage({autoHighlighter: newAutoHighlighter});
        }
        // Deal with appropriate (un)highlighting.
        if (!bodyHighlighted) {
          removeHighlightStyles();
          setupHighlighter(options);
          highlightPhrases(options);
        } else {
          bodyHighlighted = false;
          removeHighlights();
        }
      }
    });
  }

  function isAllowedURL(options) {
    return !((options.enableURLBlacklist && urlBlacklisted) || (options.enableURLWhitelist && !urlWhitelisted));
  }

  chrome.storage.local.get((options) => {
    if (options.enableAutoHighlight && options.autoHighlighter) {
      if (options.blacklist.length) {
        for (let url of options.blacklist) {
          if (window.location.href.indexOf(url) !== -1) {
            urlBlacklisted = true;
            break;
          }
        }
      }
      if (options.whitelist.length) {
        for (let url of options.whitelist) {
          if (window.location.href.indexOf(url) !== -1) {
            urlWhitelisted = true;
            break;
          }
        }
      }
      log(`URL: whitelist(${urlWhitelisted}) blacklist(${urlBlacklisted})`);
      processHighlights();
    }
  });

  chrome.storage.local.get((options) => {
    $(window).keydown((event) => {
      if (event.keyCode == options.keyboardShortcut) {
        processHighlights(true);
      }
    });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message === "highlighty") {
      processHighlights(true);
    }
  });

  function autoHighlightIfReady() {
    log("autoHighlightIfReady");
    if (mutationTime) {
      log("autoHighlightIfReady: ready");
      mutationTime = false;
      setTimeout(() => {
        mutationTime = true;
      }, MUTATION_TIMER);
      chrome.storage.local.get((options) => {
        if (options.enableAutoHighlight && options.autoHighlighter) {
          highlightPhrases(options);
        }
      });
    }
  }

  chrome.storage.local.get((options) => {
    MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
    var observer = new MutationObserver(function(mutations, observer) {
      if (options.enableAutoHighlight
          && options.enableAutoHighlightUpdates
          && isAllowedURL(options)) {
        if (mutationTime) {
          autoHighlightIfReady();
        } else {
          if (mutationDelayTime) {
            setTimeout(() => {
              mutationDelayTime = false;
              autoHighlightIfReady();
            }, MUTATION_TIMER);
          }
        }
      }
    });
    observer.observe(document, {
      subtree: true,
      childList: true
    });
 });
});
