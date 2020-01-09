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
  let phrasesToHighlight = [];    // Array of arrays of phrases, where index represents the phrase list number.

  const MUTATION_TIMER = 2000;    // Number of miliseconds between updating body after DOM change
  let mutationTime = true;        // Whether body should be updated after DOM change
  let developerMode = true;       // Whether to log messages to track perf

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
      let markOptions =
          {
            element: "span",
            className: markClasses,
            exclude: [`.${HL_BASE_CLASS}`],
            accuracy: (options.enablePartialMatch) ? "partially" : "exactly",
            caseSensitive: !options.enableCaseInsensitive,
            separateWordSearch: false,
            acrossElements: false,
            iframes: true
          };
      log(phrasesToHighlight[phraseListIndex]);
      log(markOptions);
      $("body").mark(phrasesToHighlight[phraseListIndex], markOptions);
    }
    if (options.enableTitleMouseover) {
      log("enableTitleMousever start");
      // TODO: Probably can have a more efficient algorithm here using mark.js callback
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
    $('#' + HL_STYLE_ID).remove();
  }

  function processHighlights(manualTrigger=false) {
    log("processHighlights");
    chrome.storage.local.get((options) => {
      if (!manualTrigger && urlBlacklisted) {
        chrome.runtime.sendMessage({blockedHighlighter: true});
      } else { // Let a manualTrigger override blacklist and go directly to highlight mode.
        // Deal with badges, notifying background.js.
        if (!options.enableAutoHighlight) {
          chrome.runtime.sendMessage({manualHighlighter: !bodyHighlighted, tab: true});
        } else if (manualTrigger) {
          let newAutoHighlighter = (urlBlacklisted) ? true : !options.autoHighlighter;
          urlBlacklisted = false;
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
          $("body").unmark();
        }
      }
    });
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

  chrome.storage.local.get((options) => {
    // TODO: Re-examine this logic, make more efficient..
    if (options.enableAutoHighlightUpdates && !urlBlacklisted) {
      MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
      var observer = new MutationObserver(function(mutations, observer) {
        if (mutationTime) {
          mutationTime = false;
          setTimeout(() => { mutationTime = true; }, MUTATION_TIMER);
          chrome.storage.local.get((options) => {
            if (options.enableAutoHighlight && options.autoHighlighter) {
              highlightPhrases(options);
            }
          });
        }
      });
      observer.observe(document, {
        subtree: true,
        childList: true
      });
    }
 });
});
