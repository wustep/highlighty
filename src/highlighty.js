/* Highlighty.js v1.0 | by Stephen Wu | MIT License */

$(function() {

  if (window.top != window.self) { // Don't run on frames or iframes
    return;
  }

  const HL_PREFIX_CLASS = "__hl_";    // Phrases will have class prefixed with their list numbe
  const HL_BASE_CLASS = "__hl";       // Phrases will all have this class
  const HL_STYLE_ID = "__hl_styles";  // Style block containing highlighter styles

  let bodyHighlighted = false;

  // Setup word list and append proper styles
  function setupHighlighter(wordsToHighlight, options) {
    let highlighterStyles = "<style id='" + HL_STYLE_ID + "'>." + HL_BASE_CLASS + " { " + options.baseStyles + " } ";
    for (let i = 0; i < options.highlighter.length; i++) {
      let highlighterColor = ("color" in options.highlighter[i]) ? options.highlighter[i].color : "black";
      highlighterStyles += "." + HL_PREFIX_CLASS + i + " { background-color: " + highlighterColor + " }\r\n";
      for (let j = 0; j < options.highlighter[i].words.length; j++) {
        addHighlightWord(options.highlighter[i].words[j], i, wordsToHighlight);
      }
    }
    highlighterStyles += "</style>";
    $("head").append(highlighterStyles);
    console.log(wordsToHighlight);
  }

  // Add word to highlight list given word and its list index
  function addHighlightWord(highlightWord, listNumber, wordsToHighlight) {
    highlightWord = String(highlightWord);
    if (highlightWord.length > 1) {
      if (wordsToHighlight[highlightWord]) {
        wordsToHighlight[highlightWord].push(listNumber);
      } else {
        wordsToHighlight[highlightWord] = [listNumber];
      }
    }
  }

  // Highlight words in body
  function highlightWords(wordsToHighlight, options) {
    for (let word of Object.keys(wordsToHighlight)) {
      let newHLClasses = HL_BASE_CLASS + " " + HL_PREFIX_CLASS + wordsToHighlight[word].join(" " + HL_PREFIX_CLASS);
      let markOptions = { element: "span", className: newHLClasses, separateWordSearch: false };
      $("body").mark(word, markOptions);
    }
    if (options.enabletitleMouseover) {
      for (let i = 0; i < options.highlighter.length; i++) {
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
            let wordsToHighlight = [];
            removeHighlights();
            setupHighlighter(wordsToHighlight, options);
            highlightWords(wordsToHighlight, options);
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
