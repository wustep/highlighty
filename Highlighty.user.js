// ==UserScript==
// @name         Highlighty
// @version      0.2
// @description  Given a list of text files with words to highlight and their corresponding context and color, highlight these words on a page when F6 is pressed. See fburl.com/HLquip
// @author       Stephen Wu
// @include      http://*
// @include      https://*
// @grant        GM.xmlHttpRequest
// @require      http://code.jquery.com/jquery-2.2.4.min.js#md5=2f6b11a7e914718e0290410e85366fe9
// @require      https://cdnjs.cloudflare.com/ajax/libs/mark.js/8.11.1/jquery.mark.min.js#md5=a55ba6d3e1dc033f478a8763d0e94b83
// ==/UserScript==
(function() {
    'use strict';
    $(function() {

        /* ---------- Edit here! ---------- */
        /* Follow format specified!
           Use hexcodes or color names for color. See: https://www.w3schools.com/cssref/css_colors.asp
           If you see red, it's probably because of either extra whitespace at the end of the line or a syntax error!
        */
        let highlighter = [
            {
                url: "https://pastebin.com/raw/CjGXA1BV",
                context: "words from set 1",
                color: "green"
            },
            {
                url: "https://pastebin.com/raw/zpCDnHh9",
                context: "words from set 2",
                color: "red"
            },
            {
                words: ["hello", "there", "facebook"],
                context: "words from set 3",
                color: "black"
            }
        ];
        let enableMouseoverForContext = true; // Set to true if you want to see the context above when you hover.
        const HL_BASE_STYLES = "border-radius: 0.3em; color: white; font-weight: normal; box-shadow: 1px 1px 1px 1px grey;"

        /* -------------------------------- */

        if (window.top != window.self) { // Don't run on frames or iframes
            return;
        }

        const HL_PREFIX = "__highlighter_";
        const HL_BASE_CLASS = "__highlighter";
        let wordsToHighlight = [];

        let highlighted = false; // Body is currently highlighted
        let listLoaded = false; // Body has never been highlighted, i.e. needs to load lists
        let processingListLoad = false; // In the process of loading lists

        let loadedHighlighterLists = 0;
        let numHighlighterLists = highlighter.length;

        // Setup word list and highlight words
        function setupInitialHighlight() {
            processingListLoad = true;
            let highlighterStyles = "<style>." + HL_BASE_CLASS + " { " + HL_BASE_STYLES + " } ";
            for (let i = 0; i < highlighter.length; i++) {
                let highlighterColor = ("color" in highlighter[i]) ? highlighter[i].color : "black";
                highlighterStyles += "." + HL_PREFIX + i + " { background-color: " + highlighterColor + " }\r\n";

                if ("words" in highlighter[i]) {
                    for (let j = 0; j < highlighter[i].words.length; j++) {
                        addHighlightWord(highlighter[i].words[j], i);
                    }
                    console.log(highlighter[i]);
                    if (!("url" in highlighter[i])) {
                        loadedHighlighterLists++;
                    }
                }

                if ("url" in highlighter[i]) {
                    GM.xmlHttpRequest({
                        method: "GET",
                        url: highlighter[i].url,
                        onload: function (response) { addWordsFromResponse(response, i) }
                    });
                }
            }
            highlighterStyles += "</style>";
            $("head").append(highlighterStyles);

            if (loadedHighlighterLists === numHighlighterLists) {
                processingListLoad = false;
                listLoaded = true;
                highlightWords();
            }
        }
        // Given a XHR response, add words from it to the highlight list, calling highlightWords when completely done
        function addWordsFromResponse(response, listNumber) {
            if (response.status === 200 && response.finalUrl === highlighter[listNumber].url) {
                let textLoaded = response.responseText.split('\n');
                for (let j = 0; j < textLoaded.length; j++) {
                    addHighlightWord(textLoaded[j], listNumber);
                }
            } else {
                console.error("[Highlighter] Skipped loading " + highlighter[listNumber].url + " due to failed response or redirect: ("
                              + response.status + ") URL: " + response.finalUrl);
            }
            loadedHighlighterLists++;
            if (loadedHighlighterLists === numHighlighterLists) {
                processingListLoad = false;
                listLoaded = true;
                highlightWords();
            }
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
            for (let i = 0; i < highlighter.length; i ++) {
                if ("context" in highlighter[i]) {
                    $("." + HL_PREFIX + i).attr("title", highlighter[i].context);
                }
            }
            highlighted = true;
        }
        // Process list loading and highlights if applicable
        function processHighlights() {
            // Can probs simplify the calling structure, introducing promises or something
            if (!listLoaded) {
                if (!processingListLoad) {
                    setupInitialHighlight();
                }
            } else if (!highlighted) {
                highlightWords();
            } else {
                highlighted = false;
            }
        }

        $(window).keydown(function(event) {
            if (event.keyCode == 117) { // F6
                console.log(wordsToHighlight);
                $("body").unmark({ done: processHighlights });
                event.preventDefault();
            }
        });
    });
})();
