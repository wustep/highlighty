/* Highlighty.js | by Stephen Wu */

$(function() {

  /* TODO: [Low] Add count of highlighted phrases, maybe a navigator */

  if (window.top != window.self) { // Don't run on frames or iframes
    return;
  }

  const HL_PREFIX_CLASS = "__hl_";    // Phrases will have class prefixed with their list numbe
  const HL_BASE_CLASS = "__hl";       // Phrases will all have this class
  const HL_STYLE_ID = "__hl_styles";  // Style block containing highlighter styles

  let bodyHighlighted = false;

  // Setup phrase list and append proper styles
  function setupHighlighter(phrasesToHighlight, options) {
    let highlighterStyles = `<style id="${HL_STYLE_ID}">.${HL_BASE_CLASS} { ${options.baseStyles} } `;
    for (let i = 0; i < options.highlighter.length; i++) {
      if (Object.keys(options.highlighter[i]).length) { // Skip deleted lists!
        let highlighterColor = ("color" in options.highlighter[i]) ? options.highlighter[i].color : "black";
        highlighterStyles += `.${HL_PREFIX_CLASS + i} { background-color: ${highlighterColor} }\r\n`;
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
      let markClasses = `${HL_BASE_CLASS} ${HL_PREFIX_CLASS}${phrasesToHighlight[phrase].join(" " + HL_PREFIX_CLASS)}`;
      let markOptions =
          {
            element: "span",
            className: markClasses,
            accuracy: (options.enablePartialMatch) ? "partially" : "exactly",
            caseSensitive: !options.enableCaseInsensitive,
            separateWordSearch: false,
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

  function processHighlights() {
    $("body").unmark({
      done: () => {
        if (!bodyHighlighted) {
          chrome.storage.local.get((options) => {
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

  chrome.storage.local.get("keyboardShortcut", (options) => {
    $(window).keydown((event) => {
      if (event.keyCode == options.keyboardShortcut) {
        processHighlights();
      }
    });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message === "highlighty") {
      processHighlights();
    }
  });
});
