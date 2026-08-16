/* Highlighty.js | by Stephen Wu */

import { Hilitor } from './hilitor';
import { isEditableTarget, shortcutFromKeyboardEvent } from './modules/keyboard';
import { prepareHilitorOptions } from './modules/matching';
import { isPhraseListEnabled, normalizePhrases } from './modules/phrase-lists';
import { normalizeOptions } from './modules/storage';
import type { HighlightyOptions } from './modules/types';
import { isAllowedURL } from './modules/urls';

$(function () {
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
  const MUTATION_TIMER = 3000;

  let bodyHighlighted = false;
  let blockedPageOverride = false;
  let currentOptions = null;
  let phrasesToHighlight = [];
  let currentMatchIndex = -1;
  let quickSearchPhrase = '';
  let mutationTime = true;
  let mutationDelayPending = false;
  let observer = null;
  let observerPauseDepth = 0;

  const developerMode = !('update_url' in chrome.runtime.getManifest());

  function log(stuff) {
    if (!developerMode) {
      return;
    }

    const now = new Date();
    const logPrefix = `[Highlighty] [${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}]`;
    console.log(logPrefix, stuff);
  }

  function withoutObservedMutations(callback) {
    if (observerPauseDepth === 0) observer?.disconnect();
    observerPauseDepth++;
    try {
      return callback();
    } finally {
      observerPauseDepth--;
      if (observerPauseDepth === 0) {
        observer?.observe(document, { subtree: true, childList: true });
      }
    }
  }

  function setupHighlighter(options) {
    phrasesToHighlight = [];
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
      if (!list || !Object.keys(list).length || !isPhraseListEnabled(list)) {
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
      phrasesToHighlight[listIndex] = phrases;
    });

    const styleElement = document.createElement('style');
    styleElement.id = HL_STYLE_ID;
    styleElement.textContent = highlighterStyles;
    document.head.appendChild(styleElement);
    log(phrasesToHighlight);
  }

  function highlightPhrases(options) {
    withoutObservedMutations(() => {
      for (const phraseListIndex in phrasesToHighlight) {
        const markClasses = `${HL_BASE_CLASS} ${HL_PREFIX_CLASS}${phraseListIndex}`;
        const hilitor = new Hilitor();
        hilitor.applyPhrases(phrasesToHighlight[phraseListIndex], {
          ...prepareHilitorOptions(options),
          classes: markClasses,
        });
      }

      if (quickSearchPhrase) {
        applyQuickSearch(options, quickSearchPhrase);
      }

      if (options.enableTitleMouseover) {
        options.highlighter.forEach((list, listIndex) => {
          if (list?.title && isPhraseListEnabled(list)) {
            $(`.${HL_PREFIX_CLASS}${listIndex}`)
              .addClass(HL_TOOLTIP_CLASS)
              .attr('data-highlighty-title', list.title);
          }
        });
      }

      bodyHighlighted = true;
      setupToolbar(options);
    });
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

  function applyQuickSearch(options, phrase) {
    const hilitor = new Hilitor();
    hilitor.applyPhrases([phrase], {
      ...prepareHilitorOptions(options, { partialMatch: true }),
      classes: `${HL_BASE_CLASS} ${HL_QUICK_CLASS}`,
    });
  }

  function runQuickSearch(options, phrase) {
    withoutObservedMutations(() => {
      removeMarksByClass(HL_QUICK_CLASS);
      quickSearchPhrase = phrase.trim();
      currentMatchIndex = -1;
      if (quickSearchPhrase) applyQuickSearch(options, quickSearchPhrase);
      updateNavigator();
    });
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
    withoutObservedMutations(() => {
      removeHighlights();
      $(`#${HL_STYLE_ID}`).remove();
      removeToolbar();
    });
  }

  function renderHighlights(options) {
    withoutObservedMutations(() => {
      clearHighlights();
      setupHighlighter(options);
      highlightPhrases(options);
    });
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
    if (!currentOptions?.keyboardShortcut?.trim() || isEditableTarget(event.target)) {
      return;
    }

    if (shortcutFromKeyboardEvent(event) === currentOptions.keyboardShortcut) {
      toggleHighlights();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'toggleHighlights') {
      toggleHighlights();
    }
  });

  function autoHighlightIfReady() {
    if (!mutationTime || !currentOptions) {
      return;
    }

    mutationTime = false;
    setTimeout(() => {
      mutationTime = true;
    }, MUTATION_TIMER);

    if (
      bodyHighlighted &&
      currentOptions.enableAutoHighlight &&
      currentOptions.autoHighlighter &&
      (isAllowedURL(window.location.href, currentOptions) || blockedPageOverride)
    ) {
      highlightPhrases(currentOptions);
    }
  }

  observer = new MutationObserver(() => {
    if (
      !currentOptions?.enableAutoHighlight ||
      !currentOptions.enableAutoHighlightUpdates ||
      !bodyHighlighted ||
      (!isAllowedURL(window.location.href, currentOptions) && !blockedPageOverride)
    ) {
      return;
    }

    if (mutationTime) {
      autoHighlightIfReady();
    } else if (!mutationDelayPending) {
      mutationDelayPending = true;
      setTimeout(() => {
        mutationDelayPending = false;
        autoHighlightIfReady();
      }, MUTATION_TIMER);
    }
  });
  observer.observe(document, {
    subtree: true,
    childList: true,
  });
});
