/* Highlighty.js | by Stephen Wu */

$(function () {
  if (window.top !== window.self) {
    // Don't run on frames or iframes.
    return;
  }

  const HL_PREFIX_CLASS = 'Highlighty__phrase--';
  const HL_BASE_CLASS = 'Highlighty__phrase';
  const HL_STYLE_ID = 'Highlighty__styles';
  const MUTATION_TIMER = 3000;

  let bodyHighlighted = false;
  let blockedPageOverride = false;
  let currentOptions = null;
  let phrasesToHighlight = [];
  let mutationTime = true;
  let mutationDelayPending = false;

  const developerMode = !('update_url' in chrome.runtime.getManifest());

  function log(stuff) {
    if (!developerMode) {
      return;
    }

    const now = new Date();
    const logPrefix = `[Highlighty] [${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}]`;
    console.log(logPrefix, stuff);
  }

  function isPhraseListEnabled(list) {
    // Lists created before the per-list toggle are enabled by default.
    return list.enabled !== false && list.toggled !== false;
  }

  function getValidPhrases(list) {
    if (!Array.isArray(list.phrases)) {
      return [];
    }

    return list.phrases
      .filter((phrase) => typeof phrase === 'string' && phrase.trim())
      .map((phrase) => phrase.trim());
  }

  function setupHighlighter(options) {
    phrasesToHighlight = [];
    let highlighterStyles = `<style id="${HL_STYLE_ID}">.${HL_BASE_CLASS} { ${options.baseStyles} } `;

    options.highlighter.forEach((list, listIndex) => {
      if (!list || !Object.keys(list).length || !isPhraseListEnabled(list)) {
        return;
      }

      const phrases = getValidPhrases(list);
      if (!phrases.length) {
        return;
      }

      const highlighterColor = list.color || 'black';
      const textColor = list.textColor || 'white';
      highlighterStyles += `.${HL_PREFIX_CLASS}${listIndex} { background-color: ${highlighterColor}; color: ${textColor}; }\r\n`;
      phrasesToHighlight[listIndex] = phrases;
    });

    highlighterStyles += '</style>';
    $('head').append(highlighterStyles);
    log(phrasesToHighlight);
  }

  function highlightPhrases(options) {
    for (const phraseListIndex in phrasesToHighlight) {
      const markClasses = `${HL_BASE_CLASS} ${HL_PREFIX_CLASS}${phraseListIndex}`;
      const hilitor = new Hilitor();
      hilitor.applyPhrases(phrasesToHighlight[phraseListIndex], {
        classes: markClasses,
        caseSensitive: !options.enableCaseInsensitive,
        partialMatch: options.enablePartialMatch,
      });
    }

    if (options.enableTitleMouseover) {
      options.highlighter.forEach((list, listIndex) => {
        if (list?.title && isPhraseListEnabled(list)) {
          $(`.${HL_PREFIX_CLASS}${listIndex}`).attr('title', list.title);
        }
      });
    }

    bodyHighlighted = true;
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
    $(`#${HL_STYLE_ID}`).remove();
  }

  function renderHighlights(options) {
    clearHighlights();
    setupHighlighter(options);
    highlightPhrases(options);
  }

  function urlMatchesAny(urlPhrases) {
    return Array.isArray(urlPhrases)
      ? urlPhrases.some(
          (urlPhrase) => typeof urlPhrase === 'string' && window.location.href.includes(urlPhrase),
        )
      : false;
  }

  function isAllowedURL(options) {
    const denylisted = options.enableURLDenylist && urlMatchesAny(options.denylist);
    const allowlisted = urlMatchesAny(options.allowlist);
    return !(denylisted || (options.enableURLAllowlist && !allowlisted));
  }

  function getActionState(options) {
    if (!options.enableAutoHighlight) {
      return bodyHighlighted ? 'manualOn' : 'manualOff';
    }
    if (!options.autoHighlighter) {
      return 'autoOff';
    }
    if (!isAllowedURL(options) && !blockedPageOverride) {
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
    } else if (!isAllowedURL(options)) {
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

    if (!isAllowedURL(currentOptions)) {
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
    applyOptionsState(options);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
      return;
    }

    chrome.storage.local.get((options) => {
      applyOptionsState(options);
    });
  });

  window.addEventListener('keydown', (event) => {
    if (!currentOptions?.keyboardShortcut?.trim()) {
      return;
    }

    const specialKeys = { ' ': 'space' };
    const pressedKeys = [];
    if (event.ctrlKey) pressedKeys.push('ctrl');
    if (event.shiftKey) pressedKeys.push('shift');
    if (event.altKey) pressedKeys.push('alt');
    if (event.metaKey) pressedKeys.push('meta');

    let keyString = ['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)
      ? ''
      : specialKeys[event.key] || event.key;
    if (keyString.length < 2) {
      keyString = keyString.toLowerCase();
    }
    if (keyString) pressedKeys.push(keyString);

    if (pressedKeys.join(' + ').trim() === currentOptions.keyboardShortcut) {
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
      (isAllowedURL(currentOptions) || blockedPageOverride)
    ) {
      highlightPhrases(currentOptions);
    }
  }

  const MutationObserverClass = window.MutationObserver || window.WebKitMutationObserver;
  const observer = new MutationObserverClass(() => {
    if (
      !currentOptions?.enableAutoHighlight ||
      !currentOptions.enableAutoHighlightUpdates ||
      !bodyHighlighted ||
      (!isAllowedURL(currentOptions) && !blockedPageOverride)
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
