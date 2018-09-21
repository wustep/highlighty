/* Highlighty.js v1.0 | by Stephen Wu | MIT License */

$(function() {

  /* TODO: Add count of highlighted words, maybe a navigator */

  if (window.top != window.self) { // Don't run on frames or iframes
    return;
  }

  const HL_PREFIX_CLASS = "__hl_";    // Phrases will have class prefixed with their list numbe
  const HL_BASE_CLASS = "__hl";       // Phrases will all have this class
  const HL_STYLE_ID = "__hl_styles";  // Style block containing highlighter styles

  let bodyHighlighted = false;

  // Setup phrase list and append proper styles
  function setupHighlighter(phrasesToHighlight, options) {
    let highlighterStyles = "<style id='" + HL_STYLE_ID + "'>." + HL_BASE_CLASS + " { " + options.baseStyles + " } ";
    for (let i = 0; i < options.highlighter.length; i++) {
      if (Object.keys(options.highlighter[i]).length) { // Skip deleted lists!
        let highlighterColor = ("color" in options.highlighter[i]) ? options.highlighter[i].color : "black";
        highlighterStyles += "." + HL_PREFIX_CLASS + i + " { background-color: " + highlighterColor + " }\r\n";
        for (let j = 0; j < options.highlighter[i].phrases.length; j++) {
          addHighlightPhrase(options.highlighter[i].phrases[j], i, phrasesToHighlight);
        }
      }
    }
    highlighterStyles += "</style>";
    $("head").append(highlighterStyles);
  }

  // Add phrase to highlight list given phrase and its list index
  function addHighlightPhrase(highlightPhrase, listNumber, phrasesToHighlight) {
    highlightPhrase = String(highlightPhrase);
    if (highlightPhrase.length > 1) {
      if (phrasesToHighlight[highlightPhrase]) {
        phrasesToHighlight[highlightPhrase].push(listNumber);
      } else {
        phrasesToHighlight[highlightPhrase] = [listNumber];
      }
    }
  }

  // Highlight phrases in body
  function highlightPhrases(phrasesToHighlight, options) {
    for (let phrase of Object.keys(phrasesToHighlight)) {
      let newHLClasses = HL_BASE_CLASS + " " + HL_PREFIX_CLASS + phrasesToHighlight[phrase].join(" " + HL_PREFIX_CLASS);
      let markOptions =
          {
            element: "span",
            className: newHLClasses,
            accuracy: (options.enablePartialMatch) ? "partially" : "exactly",
            caseSensitive: !options.enableCaseInsensitive,
            acrossElements: true
          };
      $("body").mark(phrase, markOptions);
    }
    if (options.enabletitleMouseover) {
      for (let i = 0; i < options.highlighter.length; i++) {
        /* TODO: [Med] Improved mouseover tooltips - these are slow and ugly */
        if ("title" in options.highlighter[i]) {
          $("." + HL_PREFIX_CLASS + i).attr("title", options.highlighter[i].title);
        }
      }
    }
    bodyHighlighted = true;
  }

  function removeHighlights() {
    $('#' + HL_STYLE_ID).remove();
  }

  // Process list loading and highlights if applicable
  function processHighlights() {
    $("body").unmark({
      done: function() {
        if (!bodyHighlighted) {
          chrome.storage.local.get(function(options) {
            console.log(options);
            let phrasesToHighlight = [];
            removeHighlights();
            setupHighlighter(phrasesToHighlight, options);
            highlightPhrases(phrasesToHighlight, options);
          });
        } else {
          bodyHighlighted = false;
        }
      }
    });
  }

  chrome.storage.local.get("keyboardShortcut", function(options) {
    $(window).keydown(function(event) {
      if (event.keyCode == options.keyboardShortcut) {
        processHighlights();
      }
    });
  });

  chrome.runtime.onMessage.addListener(function(message) {
    if (message === "highlighty") {
      processHighlights();
    }
  });
});
