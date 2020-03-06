/*
 * Hilitor.js
 * Original JavaScript code by Chirp Internet: www.chirp.com.au
 *
 * Modifications by @wustep to support applying specified classes to many phrase lists.
 */

function Hilitor() {
  let hiliteTag = "MARK";
  let skipTags = new RegExp("^(?:" + hiliteTag + "|FORM|SCRIPT|SPAN|TEXTAREA)$");
  let matchRegExp = "";
  let partialMatch = false;
  let caseSensitive = false;

  function setRegexFromPhrases(phrases) {
    let input = "";
    for (phrase of phrases) {
        phrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        input += phrase + "|";
    }
    input = input.replace(new RegExp('^[^\\w]+|[^\\w]+$', "g"), "");
    if (input) {
      let regex = "(" + input + ")";
      if (!partialMatch) {
        regex = "\\b" + regex + "\\b|\\s" + regex + "\\s";
      }
      let flags = (caseSensitive) ? "" : "i";
      matchRegExp = new RegExp(regex, flags);
      return matchRegExp;
    }
    return false;
  }

  // Recursively apply word highlighting
  function hiliteWords(node, classes="") {
    if (node === undefined || !node) return;
    if (!matchRegExp) return;
    if (skipTags.test(node.nodeName)) return;

    if (node.hasChildNodes()) {
      for (node of node.childNodes) {
        hiliteWords(node, classes);
      }
    }
    if (node.nodeType == 3) { // NODE_TEXT
      if ((nv = node.nodeValue) && (regs = matchRegExp.exec(nv))) {
        let match = document.createElement(hiliteTag);
        match.appendChild(document.createTextNode(regs[0]));
        if (classes.length) {
          match.className = classes;
        }
        let after = node.splitText(regs.index);
        after.nodeValue = after.nodeValue.substring(regs[0].length);
        node.parentNode.insertBefore(match, after);
      }
    };
  };

  /*
   * Apply classes to provided phrases list to provided targetNode.
   * markOptions should be { caseSensitive: bool, partialMatch: bool, ... }
   */
  this.applyPhrases = function(phrases, options = {}) {
    if (options.partialMatch) {
      partialMatch = true;
    }
    if (options.caseSensitive) {
      caseSensitive = true;
    }
    setRegexFromPhrases(phrases);
    hiliteWords(options.targetNode ? options.targetNode : document.body, options.classes ? options.classes : "");
  }
}
