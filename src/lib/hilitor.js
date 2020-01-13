/*
 * Hilitor.js
 * Original JavaScript code by Chirp Internet: www.chirp.com.au
 *
 * Modifications by @wustep to support applying specified classes to many phrase lists.
 */

function Hilitor() {
  let hiliteTag = "MARK";
  let skipTags = new RegExp("^(?:" + hiliteTag + "|SCRIPT|FORM|SPAN)$");
  let matchRegExp = "";
  let openLeft = false;
  let openRight = false;

  function setMatchType(type) {
    switch (type) {
      case "left":
        this.openLeft = false;
        this.openRight = true;
        break;
      case "right":
        this.openLeft = true;
        this.openRight = false;
        break;
      case "open":
        this.openLeft = this.openRight = true;
        break;
      default:
        this.openLeft = this.openRight = false;
    }
  };

  function setRegex(input, caseSensitive) {
    input = input.replace(new RegExp('^[^\\w]+|[^\\w]+$', "g"), "");
    if (input) {
      let regex = "(" + input + ")";
      if (!this.openLeft) {
        regex = "\\b" + regex;
      }
      if (!this.openRight) {
        regex = regex + "\\b";
      }
      let flags = (caseSensitive) ? "" : "i";
      matchRegExp = new RegExp(regex, flags);
      return matchRegExp;
    }
    return false;
  };

  function setRegexFromPhrases(phrases, caseSensitive) {
    let input = "";
    for (phrase of phrases) {
        phrase = phrase.replace(/\\/g, "\\\\").replace(/\./g, "\\.");
        input += phrase + "|";
    }
    setRegex(input, caseSensitive);
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
      setMatchType("open");
    } else {
      setMatchType("closed");
    }
    setRegexFromPhrases(phrases, !!options.caseSensitive);
    hiliteWords(options.targetNode ? options.targetNode : document.body, options.classes ? options.classes : "");
  }
}
