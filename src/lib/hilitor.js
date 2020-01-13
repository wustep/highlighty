/*
 * Hilitor.js
 * Original JavaScript code by Chirp Internet: www.chirp.com.au
 *
 * Modifications by @wustep:
 * - Revised coding conventions, made some functions private.
 * - Removed breakExpRegExp logic, removing bars by default.
 */

function Hilitor(id, tag) {

  let targetNode = document.getElementById(id) || document.body;
  let hiliteTag = tag || "MARK";
  let skipTags = new RegExp("^(?:" + hiliteTag + "|SCRIPT|FORM|SPAN)$");
  let colors = ["#ff6", "#a0ffff", "#9f9", "#f99", "#f6f"];
  let wordColor = [];
  let colorIdx = 0;
  let matchRegExp = "";
  let openLeft = false;
  let openRight = false;

  // Characters to strip from start and end of the input string
  let endRegExp = new RegExp('^[^\\w]+|[^\\w]+$', "g");

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
    input = input.replace(endRegExp, "");
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
    console.log(setRegex(input, caseSensitive));
  }

  function getRegex() {
    let retval = matchRegExp.toString();
    retval = retval.replace(/(^\/(\\b)?|\(|\)|(\\b)?\/i$)/g, "").replace(/\|/g, " ");
    return retval;
  };

  // Recursively apply word highlighting
  function hiliteWords(node) {
    if (node === undefined || !node) return;
    if (!matchRegExp) return;
    if (skipTags.test(node.nodeName)) return;

    if (node.hasChildNodes()) {
      for(let i = 0; i < node.childNodes.length; i++)
        hiliteWords(node.childNodes[i]);
    }
    if (node.nodeType == 3) { // NODE_TEXT
      if ((nv = node.nodeValue) && (regs = matchRegExp.exec(nv))) {
        if (!wordColor[regs[0].toLowerCase()]) {
          wordColor[regs[0].toLowerCase()] = colors[colorIdx++ % colors.length];
        }

        let match = document.createElement(hiliteTag);
        match.appendChild(document.createTextNode(regs[0]));
        match.style.backgroundColor = wordColor[regs[0].toLowerCase()];
        match.style.color = "#000";

        let after = node.splitText(regs.index);
        after.nodeValue = after.nodeValue.substring(regs[0].length);
        node.parentNode.insertBefore(match, after);
      }
    };
  };

  // Remove highlighting
  this.remove = function() {
    let arr = document.getElementsByTagName(hiliteTag);
    while (arr.length && (el = arr[0])) {
      let parent = el.parentNode;
      parent.replaceChild(el.firstChild, el);
      parent.normalize();
    }
  };

  // Start highlighting at target node
  this.apply = function(input) {
    this.remove();
    if (input === undefined || !(input = input.replace(/(^\s+|\s+$)/g, ""))) {
      return;
    }
    if (setRegex(input)) {
      hiliteWords(targetNode);
    }
    return matchRegExp;
  };

  /*
   * Apply classes to provided phrases list to provided targetNode.
   * markOptions should be { caseSensitive: bool, partialMatch: bool, ... }
   */
  this.applyPhrases = function(phrases, classes = "", options = {}) {
    if (options.partialMatch) {
      setMatchType("open");
    } else {
      setMatchType("closed");
    }
    setRegexFromPhrases(phrases, !!options.caseSensitive);
    hiliteWords(targetNode);
    //hiliteHighlightyPhrases(classes, markOptions);
  }
}
