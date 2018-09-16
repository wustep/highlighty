// ==UserScript==
// @name         Highlighty
// @version      0.1
// @description  Given a list of text files with words to highlight and their corresponding context and color, highlight these words on a page when F6 is pressed.
// @author       Stephen Wu
// @match        *://*/*
// @grant        GM.xmlHttpRequest
// @require      http://code.jquery.com/jquery-2.2.4.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/mark.js/8.11.1/jquery.mark.min.js
// ==/UserScript==

(function() {
    'use strict';
    $(function() {
        /***** Edit here! *****/

        /* Format: [URL, Context, Color, ...] (Use hexcodes or colors: https://www.w3schools.com/cssref/css_colors.asp) */
        let highlighter = ["https://pastebin.com/raw/CjGXA1BV", "words from set 1", "green",
                           "https://pastebin.com/raw/WBS63mRV", "words from set 2", "red"]
        let enableMouseoverForContext = true; // Set to true if you want to see the context above when you hover.

        /**** Don't edit anything below unless you know what you're doing! :) *****/
        if (window.top != window.self)  // Don't run on frames or iframes
            return;

        const HL_PREFIX = "__highlighter_";
        const HL_BASE_CLASS = "__highlighter";
        const HL_BASE_STYLES = "border-radius: 2px; color: white; font-weight: normal; box-shadow: 1px 1px 1px 1px grey;"
        let wordsToHighlight = [];
        let highlighted = false;
        let neverHighlighted = true;

        function loadHighlighterFiles(callback) {
            if (highlighter.length % 3 != 0) {
                alert("[Highlighter] Loaded files are formatted incorrectly! Check the wiki!");
            } else {
                let highlighterStyles = "<style>." + HL_BASE_CLASS + " { " + HL_BASE_STYLES + " } ";
                let numHighlighterFiles = highlighter.length / 3;
                let loadedHighlighterFiles = 0;
                for (let i = 0; i < highlighter.length - 2; i+= 3) {
                    highlighterStyles += "." + HL_PREFIX + i / 3 + " { background-color: " + highlighter[i+2] + " }\r\n";
                    GM.xmlHttpRequest({
                        method: "GET",
                        url: highlighter[i],
                        onload: function (response) {
                            if (response.status === 200 && response.finalUrl === highlighter[i]) {
                                let textLoaded = response.responseText.split('\n');
                                for (let j = 0; j < textLoaded.length; j++) {
                                    let highlightWord = String(textLoaded[j]);
                                    if (highlightWord.length > 1) {
                                        let listNumber = i / 3;
                                        if (wordsToHighlight[highlightWord]) {
                                            wordsToHighlight[highlightWord].push(listNumber);
                                        } else {
                                            wordsToHighlight[highlightWord] = [listNumber];
                                        }
                                    }
                                }
                            } else {
                                console.error("[Highlighter] Skipped loading " + highlighter[i] + " due to failed response or redirect: (" + response.status
                                              + ") URL: " + response.finalUrl);
                            }
                            loadedHighlighterFiles++;
                            if (loadedHighlighterFiles === numHighlighterFiles) {
                                callback();
                                console.log(wordsToHighlight);
                            }
                        }
                    });
                }
                highlighterStyles += "</style>";
                $("head").append(highlighterStyles);
            }
        }
        function highlightWords() {
            if (!highlighted) {
                for (let word of Object.keys(wordsToHighlight)) {
                    let newHLClasses = HL_BASE_CLASS + " " + HL_PREFIX + wordsToHighlight[word].join(" " + HL_PREFIX);
                    let options = { element: "span", className: newHLClasses, separateWordSearch: false };
                    $("body").mark(word, options);
                }
                for (let i = 0; i < highlighter.length - 2; i += 3) {
                    $("." + HL_PREFIX + (i / 3)).attr("title", highlighter[i + 1]);
                }
                highlighted = true;
                neverHighlighted = false;
            } else {
                highlighted = false;
            }
        }

        $(window).keydown(function(event) {
            if (event.keyCode == 117) { // 117 = F6
                $("body").unmark({
                    done: function() {
                        if (neverHighlighted) {
                            loadHighlighterFiles(highlightWords);
                        } else if (!highlighted) {
                            highlightWords();
                        } else {
                            highlighted = false;
                        }
                    }
                });
                event.preventDefault();
            }
        });
    });
})();
