/* Highlighty.js v1.0 | by Stephen Wu | MIT License */

$(function() {

  let highlighter = [
    {
      words: ["hello", "there", "facebook"],
      context: "words from set 3",
      color: "black"
    }
  ];
  const ENABLE_CONTEXT_MOUSEOVER = true; // Set to true if you want to see the context above when you hover.
  const HL_BASE_STYLES = "border-radius: 0.3em; color: white; font-weight: normal; box-shadow: 1px 1px 1px 1px grey;";

  if (window.top != window.self) { // Don't run on frames or iframes
    return;
  }

  const HL_PREFIX = "__highlighter_";
  const HL_BASE_CLASS = "__highlighter";

  let wordsToHighlight = [];
  let bodyHighlighted = false;

  setupInitialHighlight();

  // Setup word list and highlight words
  function setupInitialHighlight() {
    let highlighterStyles = "<style>." + HL_BASE_CLASS + " { " + HL_BASE_STYLES + " } ";
    for (let i = 0; i < highlighter.length; i++) {
      let highlighterColor = ("color" in highlighter[i]) ? highlighter[i].color : "black";
      highlighterStyles += "." + HL_PREFIX + i + " { background-color: " + highlighterColor + " }\r\n";
      for (let j = 0; j < highlighter[i].words.length; j++) {
        addHighlightWord(highlighter[i].words[j], i);
      }
      console.log(highlighter[i]);
    }
    highlighterStyles += "</style>";
    $("head").append(highlighterStyles);
    console.log(wordsToHighlight);
  }

  // Add word to highlight list given word and its list index
  function addHighlightWord(highlightWord, listNumber) {
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
  function highlightWords() {
    for (let word of Object.keys(wordsToHighlight)) {
      let newHLClasses = HL_BASE_CLASS + " " + HL_PREFIX + wordsToHighlight[word].join(" " + HL_PREFIX);
      let options = { element: "span", className: newHLClasses, separateWordSearch: false };
      $("body").mark(word, options);
    }
    if (ENABLE_CONTEXT_MOUSEOVER) {
      for (let i = 0; i < highlighter.length; i ++) {
        if ("context" in highlighter[i]) {
          $("." + HL_PREFIX + i).attr("title", highlighter[i].context);
        }
      }
    }
    bodyHighlighted = true;
  }

  // Process list loading and highlights if applicable
  function processHighlights() {
    if (!bodyHighlighted) {
      highlightWords();
    } else {
      bodyHighlighted = false;
    }
  }

  $(window).keydown(function(event) {
    if (event.keyCode == 117) { // F6
      $("body").unmark({ done: processHighlights });
    }
  });

  chrome.runtime.onMessage.addListener(function(message) {
    if (message === "highlighty") {
      $("body").unmark({ done: processHighlights });
    }
  });
});
