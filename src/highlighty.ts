/* Highlighty.js | by Stephen Wu */

import { Hilitor } from './hilitor';
import {
  buildHighlightAssignments,
  findHighlightAssignment,
  type HighlightAssignment,
} from './modules/highlight-plan';
import { isEditableTarget, shortcutMatchesEvent } from './modules/keyboard';
import { prepareHilitorOptions } from './modules/matching';
import { selectHighlightRoots } from './modules/mutation-roots';
import { isPhraseListEnabled, normalizePhrases } from './modules/phrase-lists';
import { normalizeOptions } from './modules/storage';
import type { HighlightyOptions, PhraseList } from './modules/types';
import { isAllowedURL, isURLAllowedForPhraseList } from './modules/urls';

declare global {
  interface Window {
    __highlightyLoaded?: boolean;
  }
}

function initializeHighlighty() {
  if (window.__highlightyLoaded) return;
  window.__highlightyLoaded = true;

  if (window.top !== window.self) {
    // Don't run on frames or iframes.
    return;
  }

  const HL_PREFIX_CLASS = 'Highlighty__phrase--';
  const HL_BASE_CLASS = 'Highlighty__phrase';
  const HL_TOOLTIP_CLASS = 'Highlighty__tooltip';
  const HL_STYLE_ID = 'Highlighty__styles';
  const HL_TOOLBAR_ID = 'Highlighty__toolbar';
  const HL_QUICK_CLASS = 'Highlighty__quick-result';
  const HL_FOCUSED_CLASS = 'Highlighty__focused';
  const HL_OVERLAP_PREFIX_CLASS = 'Highlighty__overlap--';
  const MUTATION_DELAY = 100;

  let bodyHighlighted = false;
  let blockedPageOverride = false;
  let currentOptions = null;
  let highlightAssignments: HighlightAssignment[] = [];
  let activeLists = new Map<number, PhraseList>();
  let currentMatchIndex = -1;
  let quickSearchPhrase = '';
  let observer = null;
  let mutationTimer: ReturnType<typeof setTimeout> | null = null;
  let togglePending = false;

  const developerMode = !('update_url' in chrome.runtime.getManifest());

  function log(stuff) {
    if (!developerMode) {
      return;
    }

    const now = new Date();
    const logPrefix = `[Highlighty] [${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}]`;
    console.log(logPrefix, stuff);
  }

  function discardObservedMutations() {
    observer?.takeRecords();
  }

  function setupHighlighter(options) {
    const sources = [];
    activeLists = new Map();
    let highlighterStyles = `
      .${HL_BASE_CLASS} { ${options.baseStyles} }
      .${HL_TOOLTIP_CLASS} { position: relative; cursor: help; }
      .${HL_TOOLTIP_CLASS}:hover::before {
        content: attr(data-highlighty-title);
        position: absolute;
        z-index: 2147483647;
        bottom: calc(100% + 0.55rem);
        left: 50%;
        transform: translateX(-50%);
        width: max-content;
        max-width: 16rem;
        padding: 0.4rem 0.8rem;
        overflow: hidden;
        border-radius: 4px;
        background: rgba(74, 74, 74, 0.96);
        box-shadow: 0 2px 4px rgba(10, 10, 10, 0.2);
        color: #ffffff;
        font-family: BlinkMacSystemFont, -apple-system, "Segoe UI", sans-serif;
        font-size: 0.75rem;
        font-weight: 400;
        line-height: 1.5;
        text-align: center;
        white-space: normal;
        pointer-events: none;
      }
      .${HL_TOOLTIP_CLASS}:hover::after {
        content: "";
        position: absolute;
        z-index: 2147483647;
        bottom: calc(100% + 0.15rem);
        left: 50%;
        transform: translateX(-50%);
        border: 0.4rem solid transparent;
        border-top-color: rgba(74, 74, 74, 0.96);
        pointer-events: none;
      }`;

    options.highlighter.forEach((list, listIndex) => {
      if (
        !list ||
        !Object.keys(list).length ||
        !isPhraseListEnabled(list) ||
        !isURLAllowedForPhraseList(window.location.href, list)
      ) {
        return;
      }

      const phrases = normalizePhrases(list.phrases);
      if (!phrases.length) {
        return;
      }

      const highlighterColor = list.color || 'black';
      const textColor = list.textColor || 'white';
      const customStyles = list.styles || '';
      highlighterStyles += `.${HL_PREFIX_CLASS}${listIndex} { background-color: ${highlighterColor}; color: ${textColor}; ${customStyles} }\r\n`;
      activeLists.set(listIndex, list);
      sources.push({ listIndex, phrases });
    });

    const caseSensitive = !options.enableCaseInsensitive;
    highlightAssignments = buildHighlightAssignments(sources, caseSensitive);
    for (const assignment of highlightAssignments.filter(
      ({ listIndexes }) => listIndexes.length > 1,
    )) {
      const lists = assignment.listIndexes.map((index) => activeLists.get(index));
      const stripeSize = 100 / lists.length;
      const stripes = lists.flatMap((list, index) => {
        const start = index * stripeSize;
        const end = (index + 1) * stripeSize;
        return [`${list.color} ${start}%`, `${list.color} ${end}%`];
      });
      const firstList = lists[0];
      highlighterStyles += `.${overlapClass(assignment.listIndexes)} { ${firstList.styles || ''} background-color: ${firstList.color}; background-image: linear-gradient(135deg, ${stripes.join(', ')}); color: ${firstList.textColor}; }\r\n`;
    }

    const styleElement = document.createElement('style');
    styleElement.id = HL_STYLE_ID;
    styleElement.textContent = highlighterStyles;
    document.head.appendChild(styleElement);
    log(highlightAssignments);
  }

  function overlapClass(listIndexes: number[]) {
    return `${HL_OVERLAP_PREFIX_CLASS}${listIndexes.join('-')}`;
  }

  function decorateSavedMatch(mark: HTMLElement, matchedText: string, options) {
    const assignment = findHighlightAssignment(
      matchedText,
      highlightAssignments,
      !options.enableCaseInsensitive,
    );
    if (!assignment) return;

    if (assignment.listIndexes.length === 1) {
      const listIndex = assignment.listIndexes[0];
      mark.classList.add(`${HL_PREFIX_CLASS}${listIndex}`);
      const title = activeLists.get(listIndex)?.title;
      if (options.enableTitleMouseover && title) {
        mark.classList.add(HL_TOOLTIP_CLASS);
        mark.dataset.highlightyTitle = title;
      }
      return;
    }

    mark.classList.add(overlapClass(assignment.listIndexes), HL_TOOLTIP_CLASS);
    const titles = assignment.listIndexes
      .map((index) => activeLists.get(index)?.title)
      .filter(Boolean);
    mark.dataset.highlightyTitle = `Lists: ${titles.join(', ')}`;
    mark.setAttribute('aria-label', `${matchedText} — ${mark.dataset.highlightyTitle}`);
  }

  function highlightPhrases(options, targetNodes: Node[] = [document.body]) {
    const phrases = highlightAssignments.map(({ phrase }) => phrase);
    for (const targetNode of targetNodes) {
      const hilitor = new Hilitor();
      hilitor.applyPhrases(phrases, {
        ...prepareHilitorOptions(options),
        targetNode,
        classes: HL_BASE_CLASS,
        decorateMatch: (mark, matchedText) => decorateSavedMatch(mark, matchedText, options),
      });

      if (quickSearchPhrase) {
        applyQuickSearch(options, quickSearchPhrase, targetNode);
      }
    }

    bodyHighlighted = true;
    setupToolbar(options);
    updateNavigator();
    discardObservedMutations();
  }

  function getHighlightMarks() {
    return Array.from(document.querySelectorAll(`mark.${HL_BASE_CLASS}`));
  }

  function updateNavigator() {
    const countElement = document.querySelector(`#${HL_TOOLBAR_ID} .Highlighty__count`);
    if (!countElement) return;

    const marks = getHighlightMarks();
    if (currentMatchIndex >= marks.length) {
      currentMatchIndex = marks.length ? marks.length - 1 : -1;
    }
    const currentNumber = currentMatchIndex >= 0 ? currentMatchIndex + 1 : 0;
    const countText = `${currentNumber} / ${marks.length}`;
    if (countElement.textContent !== countText) countElement.textContent = countText;
  }

  function navigateHighlights(direction) {
    const marks = getHighlightMarks();
    if (!marks.length) {
      currentMatchIndex = -1;
      updateNavigator();
      return;
    }
    marks.forEach((mark) => mark.classList.remove(HL_FOCUSED_CLASS));
    currentMatchIndex =
      currentMatchIndex === -1
        ? direction > 0
          ? 0
          : marks.length - 1
        : (currentMatchIndex + direction + marks.length) % marks.length;
    const focusedMark = marks[currentMatchIndex];
    focusedMark.classList.add(HL_FOCUSED_CLASS);
    focusedMark.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    updateNavigator();
  }

  function removeMarksByClass(className) {
    const marks = document.getElementsByClassName(className);
    while (marks.length) {
      const mark = marks[0];
      const parent = mark.parentNode;
      parent.replaceChild(mark.firstChild, mark);
      parent.normalize();
    }
  }

  function applyQuickSearch(options, phrase, targetNode: Node = document.body) {
    const hilitor = new Hilitor();
    hilitor.applyPhrases([phrase], {
      ...prepareHilitorOptions(options, { partialMatch: true }),
      targetNode,
      classes: `${HL_BASE_CLASS} ${HL_QUICK_CLASS}`,
    });
  }

  function runQuickSearch(options, phrase) {
    removeMarksByClass(HL_QUICK_CLASS);
    quickSearchPhrase = phrase.trim();
    currentMatchIndex = -1;
    if (quickSearchPhrase) applyQuickSearch(options, quickSearchPhrase);
    updateNavigator();
    discardObservedMutations();
  }

  function setupToolbar(options) {
    const toolbarEnabled = options.enablePhraseNavigator || options.enableQuickSearch;
    let toolbar = document.getElementById(HL_TOOLBAR_ID);
    if (!toolbarEnabled) {
      toolbar?.remove();
      return;
    }
    if (!toolbar) {
      toolbar = document.createElement('aside');
      toolbar.id = HL_TOOLBAR_ID;
      toolbar.setAttribute('aria-label', 'Highlighty tools');
      toolbar.setAttribute('data-highlighty-ignore', '');

      if (options.enablePhraseNavigator) {
        const navigator = document.createElement('div');
        navigator.className = 'Highlighty__navigator';
        const previousButton = document.createElement('button');
        previousButton.type = 'button';
        previousButton.textContent = '←';
        previousButton.title = 'Previous highlight';
        previousButton.setAttribute('aria-label', 'Previous highlight');
        previousButton.addEventListener('click', () => navigateHighlights(-1));
        const count = document.createElement('span');
        count.className = 'Highlighty__count';
        count.setAttribute('aria-live', 'polite');
        const nextButton = document.createElement('button');
        nextButton.type = 'button';
        nextButton.textContent = '→';
        nextButton.title = 'Next highlight';
        nextButton.setAttribute('aria-label', 'Next highlight');
        nextButton.addEventListener('click', () => navigateHighlights(1));
        navigator.append(previousButton, count, nextButton);
        toolbar.appendChild(navigator);
      }

      if (options.enableQuickSearch) {
        const quickSearchForm = document.createElement('form');
        quickSearchForm.className = 'Highlighty__quick-search';
        const quickSearchInput = document.createElement('input');
        quickSearchInput.className = 'Highlighty__quick-search-input';
        quickSearchInput.type = 'search';
        quickSearchInput.placeholder = 'Quick highlight…';
        quickSearchInput.setAttribute('aria-label', 'Phrase to highlight');
        quickSearchInput.value = quickSearchPhrase;
        const searchButton = document.createElement('button');
        searchButton.type = 'submit';
        searchButton.textContent = 'Highlight';
        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.textContent = 'Clear';
        clearButton.addEventListener('click', () => {
          quickSearchInput.value = '';
          runQuickSearch(options, '');
          quickSearchInput.focus();
        });
        quickSearchForm.addEventListener('submit', (event) => {
          event.preventDefault();
          runQuickSearch(options, quickSearchInput.value);
        });
        quickSearchForm.append(quickSearchInput, searchButton, clearButton);
        toolbar.appendChild(quickSearchForm);
      }
      document.documentElement.appendChild(toolbar);
    }
    updateNavigator();
  }

  function removeToolbar() {
    document.getElementById(HL_TOOLBAR_ID)?.remove();
    currentMatchIndex = -1;
    quickSearchPhrase = '';
  }

  function removeHighlights() {
    const highlightedElements = document.getElementsByClassName(HL_BASE_CLASS);
    while (highlightedElements.length) {
      const mark = highlightedElements[0];
      const parent = mark.parentNode;
      parent.replaceChild(mark.firstChild, mark);
      parent.normalize();
    }
    bodyHighlighted = false;
  }

  function clearHighlights() {
    removeHighlights();
    document.getElementById(HL_STYLE_ID)?.remove();
    removeToolbar();
    discardObservedMutations();
  }

  function renderHighlights(options) {
    clearHighlights();
    setupHighlighter(options);
    highlightPhrases(options);
  }

  function getActionState(options) {
    if (!options.enableAutoHighlight) {
      return bodyHighlighted ? 'manualOn' : 'manualOff';
    }
    if (!options.autoHighlighter) {
      return 'autoOff';
    }
    if (!isAllowedURL(window.location.href, options) && !blockedPageOverride) {
      return 'blocked';
    }
    return blockedPageOverride ? 'manualOn' : 'autoOn';
  }

  function updateActionState() {
    if (!currentOptions) {
      return;
    }
    chrome.runtime.sendMessage({
      type: 'actionState',
      state: getActionState(currentOptions),
    });
  }

  function applyOptionsState(options) {
    currentOptions = options;

    if (!options.enableAutoHighlight) {
      blockedPageOverride = false;
      clearHighlights();
    } else if (!options.autoHighlighter) {
      blockedPageOverride = false;
      clearHighlights();
    } else if (!isAllowedURL(window.location.href, options)) {
      if (!blockedPageOverride) {
        clearHighlights();
      } else {
        renderHighlights(options);
      }
    } else {
      blockedPageOverride = false;
      renderHighlights(options);
    }

    updateActionState();
  }

  function toggleHighlights() {
    if (!currentOptions) {
      return;
    }

    if (!currentOptions.enableAutoHighlight) {
      if (bodyHighlighted) {
        clearHighlights();
      } else {
        renderHighlights(currentOptions);
      }
      updateActionState();
      return;
    }

    if (!currentOptions.autoHighlighter) {
      chrome.storage.local.set({ autoHighlighter: true });
      return;
    }

    if (!isAllowedURL(window.location.href, currentOptions)) {
      blockedPageOverride = !bodyHighlighted;
      if (blockedPageOverride) {
        renderHighlights(currentOptions);
      } else {
        clearHighlights();
      }
      updateActionState();
      return;
    }

    chrome.storage.local.set({ autoHighlighter: false });
  }

  chrome.storage.local.get((options) => {
    applyOptionsState(normalizeOptions(options));
    if (togglePending) {
      togglePending = false;
      toggleHighlights();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
      return;
    }

    chrome.storage.local.get((options) => {
      applyOptionsState(normalizeOptions(options));
    });
  });

  window.addEventListener('keydown', (event) => {
    if (
      event.repeat ||
      !currentOptions?.keyboardShortcut?.trim() ||
      isEditableTarget(event.target) ||
      !shortcutMatchesEvent(currentOptions.keyboardShortcut, event)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleHighlights();
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'toggleHighlights') {
      if (currentOptions) {
        toggleHighlights();
      } else {
        togglePending = true;
      }
    }
  });

  function highlightAddedNodes(nodes: Node[]) {
    if (
      !currentOptions ||
      !bodyHighlighted ||
      !currentOptions.enableAutoHighlight ||
      !currentOptions.autoHighlighter ||
      (!isAllowedURL(window.location.href, currentOptions) && !blockedPageOverride)
    ) {
      return;
    }

    const roots = selectHighlightRoots(nodes);
    if (roots.length) highlightPhrases(currentOptions, roots);
  }

  const pendingAddedNodes = new Set<Node>();
  observer = new MutationObserver((records) => {
    if (
      !currentOptions?.enableAutoHighlight ||
      !currentOptions.enableAutoHighlightUpdates ||
      !bodyHighlighted ||
      (!isAllowedURL(window.location.href, currentOptions) && !blockedPageOverride)
    ) {
      return;
    }

    for (const record of records) {
      for (const node of record.addedNodes) pendingAddedNodes.add(node);
    }
    if (!pendingAddedNodes.size || mutationTimer) return;

    mutationTimer = setTimeout(() => {
      mutationTimer = null;
      const nodes = [...pendingAddedNodes];
      pendingAddedNodes.clear();
      highlightAddedNodes(nodes);
    }, MUTATION_DELAY);
  });
  observer.observe(document, {
    subtree: true,
    childList: true,
  });
}

initializeHighlighty();
