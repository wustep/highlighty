/*
 * Hilitor.js
 * Original JavaScript code by Chirp Internet: www.chirp.com.au
 *
 * Modifications by @wustep to support applying specified classes to many phrase lists.
 */

import { buildPhraseRegExp, type PhraseMatchOptions } from './modules/matching';

export interface HilitorOptions extends PhraseMatchOptions {
  targetNode?: Node;
  classes?: string;
  decorateMatch?: (mark: HTMLElement, matchedText: string) => void;
}

export class Hilitor {
  private readonly hiliteTag = 'MARK';
  private readonly skipTags = new RegExp(`^(?:${this.hiliteTag}|FORM|HEAD|SCRIPT|STYLE|TEXTAREA)$`);
  private matchRegExp: RegExp | null = null;
  private decorateMatch: HilitorOptions['decorateMatch'];

  // Recursively apply word highlighting
  private hiliteWords(node: Node | null | undefined, classes = ''): void {
    if (!node || !this.matchRegExp) return;
    if (this.skipTags.test(node.nodeName)) return;
    if (
      node.nodeType === Node.TEXT_NODE &&
      node.parentElement?.closest('[data-highlighty-ignore]')
    ) {
      return;
    }

    if (node.hasChildNodes()) {
      for (const childNode of node.childNodes) {
        this.hiliteWords(childNode, classes);
      }
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const nodeValue = node.nodeValue;
      const regexMatch = nodeValue && this.matchRegExp.exec(nodeValue);
      if (regexMatch) {
        const match = document.createElement(this.hiliteTag);
        match.setAttribute('data-highlighty-ignore', '');
        match.appendChild(document.createTextNode(regexMatch[0]));
        if (classes.length) match.className = classes;
        this.decorateMatch?.(match, regexMatch[0]);
        const after = textNode.splitText(regexMatch.index);
        after.nodeValue = after.nodeValue.substring(regexMatch[0].length);
        textNode.parentNode?.insertBefore(match, after);
        this.hiliteWords(after, classes);
      }
    }
  }

  applyPhrases(phrases: string[], options: HilitorOptions = {}): void {
    this.matchRegExp = buildPhraseRegExp(phrases, {
      partialMatch: Boolean(options.partialMatch),
      caseSensitive: Boolean(options.caseSensitive),
    });
    this.decorateMatch = options.decorateMatch;
    this.hiliteWords(options.targetNode || document.body, options.classes || '');
  }
}
