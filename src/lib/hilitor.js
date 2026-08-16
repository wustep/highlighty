/*
 * Hilitor.js
 * Original JavaScript code by Chirp Internet: www.chirp.com.au
 *
 * Modifications by @wustep to support applying specified classes to many phrase lists.
 */

function Hilitor() {
  const hiliteTag = 'MARK';
  const skipTags = new RegExp('^(?:' + hiliteTag + '|FORM|HEAD|SCRIPT|STYLE|TEXTAREA)$');
  let matchRegExp = '';
  let partialMatch = false;
  let caseSensitive = false;

  function setRegexFromPhrases(phrases) {
    const phraseSources = phrases.map((phrase) =>
      String(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    );
    if (phraseSources.length) {
      let regex = '(?:' + phraseSources.join('|') + ')';
      if (!partialMatch) {
        regex = '\\b' + regex + '\\b';
      }
      const flags = caseSensitive ? '' : 'i';
      matchRegExp = new RegExp(regex, flags);
      return matchRegExp;
    }
    return false;
  }

  // Recursively apply word highlighting
  function hiliteWords(node, classes = '') {
    if (node === undefined || !node) return;
    if (!matchRegExp) return;
    if (skipTags.test(node.nodeName)) return;
    if (
      node.nodeType === Node.TEXT_NODE &&
      node.parentElement &&
      node.parentElement.closest('[data-highlighty-ignore]')
    ) {
      return;
    }

    if (node.hasChildNodes()) {
      for (const childNode of node.childNodes) {
        hiliteWords(childNode, classes);
      }
    }
    if (node.nodeType == 3) {
      // NODE_TEXT
      const nodeValue = node.nodeValue;
      const regexMatch = nodeValue && matchRegExp.exec(nodeValue);
      if (regexMatch) {
        const match = document.createElement(hiliteTag);
        match.appendChild(document.createTextNode(regexMatch[0]));
        if (classes.length) {
          match.className = classes;
        }
        const after = node.splitText(regexMatch.index);
        after.nodeValue = after.nodeValue.substring(regexMatch[0].length);
        node.parentNode.insertBefore(match, after);
      }
    }
  }

  /*
   * Apply classes to provided phrases list to provided targetNode.
   * markOptions should be { caseSensitive: bool, partialMatch: bool, ... }
   */
  this.applyPhrases = function (phrases, options = {}) {
    if (options.partialMatch) {
      partialMatch = true;
    }
    if (options.caseSensitive) {
      caseSensitive = true;
    }
    setRegexFromPhrases(phrases);
    hiliteWords(
      options.targetNode ? options.targetNode : document.body,
      options.classes ? options.classes : '',
    );
  };
}
