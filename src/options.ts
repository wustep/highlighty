/* Highlighty.js | by Stephen Wu */

import { getTextColor, hexClean, rgbaStringToHex } from './modules/colors';
import { getDelimitedPhrases, parseBulkImport } from './modules/import-export';
import {
  isLikelyReservedShortcut,
  normalizeShortcut,
  shortcutFromKeyboardEvent,
} from './modules/keyboard';
import {
  addUniquePhrases,
  clonePhraseLists,
  normalizeSortOrder,
  sortPhrases,
  sortStoredPhraseLists,
} from './modules/phrase-lists';
import { DEFAULT_BASE_STYLES, normalizeOptions } from './modules/storage';
import { validateStyleDeclarations as isValidStyleDeclarations } from './modules/styles';
import type { HighlightyOptions } from './modules/types';

document.addEventListener('DOMContentLoaded', () => {
  const query = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) =>
    root.querySelector<T>(selector);
  const queryAll = <T extends Element = HTMLElement>(
    selector: string,
    root: ParentNode = document,
  ) => Array.from(root.querySelectorAll<T>(selector));
  const input = (selector: string, root: ParentNode = document) =>
    query<HTMLInputElement>(selector, root);
  const textarea = (selector: string, root: ParentNode = document) =>
    query<HTMLTextAreaElement>(selector, root);
  const select = (selector: string, root: ParentNode = document) =>
    query<HTMLSelectElement>(selector, root);
  const setVisible = (element: HTMLElement, visible: boolean) => {
    if (!visible) {
      element.style.display = 'none';
      return;
    }
    element.style.removeProperty('display');
    if (getComputedStyle(element).display === 'none') element.style.display = 'block';
  };
  const delegate = (
    element: Element,
    eventName: string,
    selector: string,
    handler: (event: Event, target: HTMLElement) => void,
  ) => {
    element.addEventListener(eventName, (event) => {
      const target = (event.target as Element).closest<HTMLElement>(selector);
      if (target && element.contains(target)) handler(event, target);
    });
  };
  const settingsInputSelector = [
    '#Settings__enableAutoHighlight',
    '#Settings__enableAutoHighlightUpdates',
    '#Settings__enableTitleMouseover',
    '#Settings__enablePartialMatch',
    '#Settings__enableCaseInsensitive',
    '#Settings__enablePhraseNavigator',
    '#Settings__enableQuickSearch',
    '#Settings__keyboardShortcut',
    '#Settings__enableURLDenylist',
    '#Settings__enableURLAllowlist',
    '#Settings__sorting',
    '#Settings__baseStyles',
  ].join(', ');
  let settingsDirty = false;
  let removeDialogHandlers = () => {};

  interface DialogOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
    inputValue?: string;
    onConfirm?: (value?: string) => void;
  }

  function getOptions(callback: (options: HighlightyOptions) => void): void {
    chrome.storage.local.get((options) => callback(normalizeOptions(options)));
  }

  /**
   * Set up or reset the options page handlers and lists components.
   * If fresh is false, then don't run the one-time handlers setup meant for a fresh load.
   */
  function setupOptionsPage(options: HighlightyOptions, fresh = true) {
    removeExistingLists();
    removeExistingListStyles();

    addExistingLists(options);
    addExistingListStyles(options);
    applyPhraseSearch();
    // These handlers should only be ran once.
    if (fresh) {
      setupKeyboardShortcutHandler(options.keyboardShortcut);
      setupSearchPhraseListsHandler();
      addExistingURLLists(options);
      setPrimarySettings(options);
      setupAutoHighlightHandler();
      setupURLListHandlers();
      setupAddPhraseListHandler();
      setupImportExportModals();
      setupUnsavedSettingsHandlers();
      setupOptionalSettingsHandlers();
    }
  }

  function showDialog({
    title = 'Highlighty',
    message,
    confirmLabel = 'OK',
    cancelLabel = '',
    isDanger = false,
    inputValue,
    onConfirm = () => {},
  }: DialogOptions) {
    removeDialogHandlers();
    const modal = query('#DialogModal');
    const confirm = query<HTMLButtonElement>('#DialogModal__confirm');
    const cancel = query<HTMLButtonElement>('#DialogModal__cancel');
    const inputField = query('#DialogModal__inputField');
    const dialogInput = input('#DialogModal__input');
    const previouslyFocused = document.activeElement;
    const hasInput = typeof inputValue === 'string';

    query('#DialogModal__title').textContent = title;
    query('#DialogModal__message').textContent = message;
    confirm.textContent = confirmLabel;
    confirm.classList.toggle('is-link', !isDanger);
    confirm.classList.toggle('is-danger', isDanger);
    cancel.textContent = cancelLabel || 'Cancel';
    setVisible(cancel, Boolean(cancelLabel));
    setVisible(inputField, hasInput);
    dialogInput.value = hasInput ? inputValue : '';

    function closeDialog() {
      modal.classList.remove('is-active');
      modal.setAttribute('aria-hidden', 'true');
      removeDialogHandlers();
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    }

    function handleConfirm() {
      const value = hasInput ? dialogInput.value.trim() : undefined;
      closeDialog();
      onConfirm(value);
    }
    const closeControls = queryAll(
      '#DialogModal__cancel, #DialogModal__close, #DialogModal .modal-background',
    );
    function handleDialogKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeDialog();
      } else if (e.key === 'Enter' && (hasInput || document.activeElement === confirm)) {
        e.preventDefault();
        confirm.click();
      }
    }
    confirm.addEventListener('click', handleConfirm);
    closeControls.forEach((element) => element.addEventListener('click', closeDialog));
    document.addEventListener('keydown', handleDialogKeydown);
    removeDialogHandlers = () => {
      confirm.removeEventListener('click', handleConfirm);
      closeControls.forEach((element) => element.removeEventListener('click', closeDialog));
      document.removeEventListener('keydown', handleDialogKeydown);
      removeDialogHandlers = () => {};
    };

    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');
    if (hasInput) {
      dialogInput.focus();
      dialogInput.select();
    } else {
      confirm.focus();
    }
  }

  function removeExistingLists() {
    // This will also remove all associated handlers in the phrase list
    queryAll('#PhraseLists__results .PhraseList:not(#PhraseList--invisible)').forEach((element) =>
      element.remove(),
    );
  }

  function removeExistingListStyles() {
    query('#HighlighterStyles')?.remove();
  }

  function redoAllListStyles(options) {
    removeExistingListStyles();
    addExistingListStyles(options);
  }

  function setPrimarySettings(options) {
    input('#Settings__enableAutoHighlight').checked = options.enableAutoHighlight;
    input('#Settings__enableAutoHighlightUpdates').checked = options.enableAutoHighlightUpdates;
    input('#Settings__enableTitleMouseover').checked = options.enableTitleMouseover;
    input('#Settings__enablePartialMatch').checked = options.enablePartialMatch;
    input('#Settings__enableCaseInsensitive').checked = options.enableCaseInsensitive;
    input('#Settings__enablePhraseNavigator').checked = options.enablePhraseNavigator;
    input('#Settings__enableQuickSearch').checked = options.enableQuickSearch;
    input('#Settings__keyboardShortcut').value = options.keyboardShortcut;
    input('#Settings__enableURLDenylist').checked = options.enableURLDenylist;
    input('#Settings__enableURLAllowlist').checked = options.enableURLAllowlist;
    select('#Settings__sorting').value = options.sorting;
    textarea('#Settings__baseStyles').value = options.baseStyles;
    showHideAutoHighlightSettings();
    setSettingsDirty(false);
  }

  function showHideAutoHighlightSettings() {
    setVisible(query('#Settings__AutoHighlight'), input('#Settings__enableAutoHighlight').checked);
  }

  function setupAutoHighlightHandler() {
    input('#Settings__enableAutoHighlight').addEventListener('click', () => {
      showHideAutoHighlightSettings();
    });
  }

  function setupOptionalSettingsHandlers() {
    query('#Settings__resetBaseStyles').addEventListener('click', () => {
      const baseStyles = textarea('#Settings__baseStyles');
      baseStyles.value = DEFAULT_BASE_STYLES;
      baseStyles.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function setSettingsDirty(isDirty) {
    settingsDirty = isDirty;
    query<HTMLButtonElement>('#Settings__save').disabled = !isDirty;
    const status = query('#Settings__saveStatus');
    status.classList.remove('is-danger');
    status.classList.toggle('is-light', !isDirty);
    status.classList.toggle('is-warning', isDirty);
    status.textContent = isDirty ? 'Unsaved settings' : 'All settings saved';
  }

  function setupUnsavedSettingsHandlers() {
    delegate(query('#Settings'), 'change', settingsInputSelector, () => {
      setSettingsDirty(true);
    });
    window.addEventListener('beforeunload', (event) => {
      if (!settingsDirty) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  function setupKeyboardShortcutHandler(savedShortcut) {
    const keyboardShortcutInput = input('#Settings__keyboardShortcut');
    const shortcutStatus = query('#Settings__keyboardShortcutStatus');
    let committedShortcut = '';
    let pendingShortcut = '';
    let pendingCode = '';

    function updateShortcutInput(shortcutString, isUserChange = false) {
      shortcutString = normalizeShortcut(shortcutString);
      const previousShortcut = committedShortcut;
      committedShortcut = shortcutString;
      keyboardShortcutInput.value = shortcutString;
      const isReserved = isLikelyReservedShortcut(shortcutString);
      shortcutStatus.classList.toggle('has-text-warning', isReserved);
      shortcutStatus.textContent = isReserved
        ? 'This shortcut is commonly reserved by the browser or operating system and may not be available.'
        : shortcutString
          ? 'Focus the shortcut box and press a new key combination to replace it.'
          : 'No in-page shortcut is set. Focus the box and press a key combination.';
      if (isUserChange && previousShortcut !== shortcutString) {
        setSettingsDirty(true);
      }
    }

    function stopRecording() {
      keyboardShortcutInput.setAttribute('data-recording', 'false');
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      if (pendingShortcut) updateShortcutInput(committedShortcut);
      pendingShortcut = '';
      pendingCode = '';
    }

    updateShortcutInput(savedShortcut);

    keyboardShortcutInput.addEventListener('focus', () => {
      keyboardShortcutInput.setAttribute('data-recording', 'true');
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
      shortcutStatus.classList.remove('has-text-warning');
      shortcutStatus.textContent =
        'Recording… Press a complete key combination. Escape clears the shortcut.';
    });

    keyboardShortcutInput.addEventListener('blur', () => {
      stopRecording();
    });

    function handleKeyDown(e) {
      if (e.repeat) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        updateShortcutInput('', true);
        keyboardShortcutInput.blur();
        return;
      }
      const shortcut = shortcutFromKeyboardEvent(e);
      if (!shortcut) return;
      e.preventDefault();
      e.stopPropagation();
      pendingShortcut = shortcut;
      pendingCode = e.code;
      keyboardShortcutInput.value = shortcut;
      shortcutStatus.textContent = 'Release the key to use this shortcut.';
    }

    function handleKeyUp(e) {
      if (!pendingShortcut || e.code !== pendingCode) return;
      e.preventDefault();
      e.stopPropagation();
      updateShortcutInput(pendingShortcut, true);
      pendingShortcut = '';
      pendingCode = '';
    }

    query('#Settings__clearKeyboardShortcut').addEventListener('click', () => {
      updateShortcutInput('', true);
      keyboardShortcutInput.focus();
    });
    query('#Settings__resetKeyboardShortcut').addEventListener('click', () => {
      updateShortcutInput('F6', true);
      keyboardShortcutInput.focus();
    });
  }

  function setupSearchPhraseListsHandler() {
    input('#PhraseLists__search').addEventListener('input', applyPhraseSearch);
  }

  function applyPhraseSearch() {
    const searchText = input('#PhraseLists__search').value.trim().toLowerCase();
    let matchingPhraseCount = 0;
    let matchingListCount = 0;

    queryAll('#PhraseLists__results .PhraseList:not(#PhraseList--invisible)').forEach((list) => {
      let listMatchCount = 0;
      queryAll<HTMLElement>('.PhraseList__phrase', list).forEach((phrase) => {
        const phraseText = String(phrase.dataset.phrase || phrase.textContent).toLowerCase();
        const matches = searchText.length === 0 || phraseText.includes(searchText);
        setVisible(phrase, matches);
        if (matches) listMatchCount++;
      });
      const listMatches = searchText.length === 0 || listMatchCount > 0;
      setVisible(list, listMatches);
      if (listMatches) {
        matchingListCount++;
        matchingPhraseCount += listMatchCount;
      }
    });

    query('#PhraseLists__noResults').classList.toggle(
      'is-hidden',
      searchText.length === 0 || matchingPhraseCount > 0,
    );
    query('#PhraseLists__searchSummary').textContent =
      searchText.length === 0
        ? `${pluralize(matchingPhraseCount, 'phrase')} in ${pluralize(matchingListCount, 'list')}`
        : `${pluralize(matchingPhraseCount, 'matching phrase')} in ${pluralize(
            matchingListCount,
            'list',
          )}`;
  }

  function addExistingURLLists(options) {
    (options.denylist || []).forEach((url) => addURLListElement('Denylist', url));
    (options.allowlist || []).forEach((url) => addURLListElement('Allowlist', url));
  }

  function addURLListElement(listName, url) {
    const urlElement = document.createElement('span');
    urlElement.className = `tag is-medium ${listName}__url`;
    urlElement.dataset.url = url;
    urlElement.textContent = url;
    const deleteButton = document.createElement('button');
    deleteButton.className = `delete is-small ${listName}__url__delete`;
    deleteButton.setAttribute('aria-label', `Delete ${url}`);
    urlElement.append(deleteButton);
    query(`#${listName}__urls`).append(urlElement);
  }

  function addExistingListStyles(options) {
    let highlighterStyles = `span.PhraseList__phrase, span.Denylist__url { ${options.baseStyles} }\r\n`;
    for (let i = 0; i < options.highlighter.length; i++) {
      const {
        color: highlighterColor = 'black',
        textColor = 'white',
        styles: customStyles = '',
      } = options.highlighter[i];
      const phraseCount = query<HTMLElement>(`#PhraseList--${i} .PhraseList__phraseCount`);
      phraseCount.style.backgroundColor = highlighterColor;
      phraseCount.style.color = textColor;
      highlighterStyles += `span.PhraseList__phrase--${i} { background-color: ${highlighterColor}; color: ${textColor}; ${customStyles} }\r\n`;
    }
    const styleElement = document.createElement('style');
    styleElement.id = 'HighlighterStyles';
    styleElement.textContent = highlighterStyles;
    document.head.appendChild(styleElement);
  }

  function addExistingLists(options, isImportPreview = false) {
    const highlighter = Array.isArray(options) ? options : options.highlighter;
    const sorting = Array.isArray(options) ? 'None' : options.sorting;
    for (let i = 0; i < highlighter.length; i++) {
      const newListDiv = addNewListDiv(highlighter[i], i, isImportPreview);
      const sortedList = sortPhrases(highlighter[i].phrases, sorting);
      for (const phrase of sortedList) {
        if (isImportPreview) {
          addPreviewPhraseElement(newListDiv, phrase, highlighter[i].color);
        } else {
          addPhraseElement(newListDiv, phrase, i, false);
        }
      }
    }
  }

  function addNewListDiv(list, index, isImportPreview = false) {
    const enabled = list.enabled !== false && list.toggled !== false;
    const newListDiv = query(
      !isImportPreview ? '#PhraseList--invisible' : '#PhraseListPreview--invisible',
    ).cloneNode(true) as HTMLElement;
    newListDiv.id = `PhraseList--${index}`;
    newListDiv.dataset.enabled = String(enabled);
    newListDiv.dataset.index = String(index);
    query<HTMLElement>('.PhraseList__color', newListDiv).style.backgroundColor = list.color;
    query('.PhraseList__title', newListDiv).textContent = list.title;
    const phraseCount = query('.PhraseList__phraseCount', newListDiv);
    if (phraseCount) phraseCount.textContent = '0 phrases';
    const customStyles = textarea('.PhraseList__customStyles', newListDiv);
    if (customStyles) customStyles.value = list.styles || '';
    (list.allowlist || []).forEach((url) => addPhraseListURLTag(newListDiv, 'allowlist', url));
    (list.denylist || []).forEach((url) => addPhraseListURLTag(newListDiv, 'denylist', url));
    const toggleId = `PhraseList__enabled--${index}`;
    const enabledInput = input('.PhraseList__enabled', newListDiv);
    if (enabledInput) {
      enabledInput.id = toggleId;
      enabledInput.checked = enabled;
      query('.PhraseList__enabledLabel', newListDiv).setAttribute('for', toggleId);
    }
    if (isImportPreview) {
      query('#BulkImportPreviewModal__preview').append(newListDiv);
    } else {
      setupPhraseListHandlers(newListDiv);
      query('#PhraseList--invisible').before(newListDiv);
    }
    return newListDiv;
  }

  function addPhraseElement(listDiv, phrase, listIndex, updateSearch = true) {
    const phraseElement = document.createElement('span');
    phraseElement.className = `tag is-medium PhraseList__phrase PhraseList__phrase--${listIndex}`;
    phraseElement.dataset.list = String(listIndex);
    phraseElement.dataset.phrase = phrase;
    phraseElement.textContent = phrase;
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete is-small PhraseList__phrase__delete';
    deleteButton.setAttribute('aria-label', `Delete ${phrase}`);
    phraseElement.append(deleteButton);
    query('.PhraseList__phrases', listDiv).append(phraseElement);
    incrementPhraseCount(listDiv);
    if (updateSearch) applyPhraseSearch();
  }

  function incrementPhraseCount(listDiv) {
    const phraseCountElement = query<HTMLElement>('.PhraseList__phraseCount', listDiv);
    // Defaults to 0 if data-count attribute not set
    let phraseCount = parseInt(phraseCountElement.dataset.count || '0', 10);
    phraseCount++;
    phraseCountElement.dataset.count = String(phraseCount);
    phraseCountElement.textContent = `${phraseCount} phrase${phraseCount !== 1 ? 's' : ''}`;
  }

  function decrementPhraseCount(listDiv) {
    const phraseCountElement = query<HTMLElement>('.PhraseList__phraseCount', listDiv);
    let phraseCount = parseInt(phraseCountElement.dataset.count || '0', 10);
    phraseCount = Math.max(0, phraseCount - 1);
    phraseCountElement.dataset.count = String(phraseCount);
    phraseCountElement.textContent = `${phraseCount} phrase${phraseCount !== 1 ? 's' : ''}`;
  }

  function addPreviewPhraseElement(listDiv, phrase, color) {
    const textColor = getTextColor(color);
    const phraseElement = document.createElement('span');
    phraseElement.className = 'tag is-medium PhraseList__phrase';
    phraseElement.dataset.phrase = phrase;
    phraseElement.style.backgroundColor = color;
    phraseElement.style.color = textColor;
    phraseElement.textContent = phrase;
    query('.PhraseList__phrases', listDiv).append(phraseElement);
  }

  function setupURLListHandlers() {
    setupURLListHandler('Denylist', 'denylist');
    setupURLListHandler('Allowlist', 'allowlist');
    delegate(query('#Settings'), 'click', '#Settings__enableURLDenylist', () => {
      input('#Settings__enableURLAllowlist').checked = false;
    });
    delegate(query('#Settings'), 'click', '#Settings__enableURLAllowlist', () => {
      input('#Settings__enableURLDenylist').checked = false;
    });
  }

  function setupURLListHandler(
    listName: 'Denylist' | 'Allowlist',
    optionName: 'denylist' | 'allowlist',
  ) {
    query(`#${listName}__add`).addEventListener('click', (event) => {
      event.preventDefault();
      const urlInput = input(`#${listName}__urlInput`);
      const newURL = urlInput.value.trim();
      if (!newURL) return;

      getOptions((options) => {
        const urls = options[optionName] || [];
        urlInput.value = '';
        if (urls.includes(newURL)) {
          showDialog({
            title: 'Already added',
            message: `That URL is already in the ${optionName}.`,
          });
          return;
        }
        urls.push(newURL);
        chrome.storage.local.set({ [optionName]: urls }, () => {
          addURLListElement(listName, newURL);
        });
      });
    });

    delegate(query('#Settings'), 'click', `.${listName}__url__delete`, (_event, target) => {
      const urlElement = target.parentElement;
      const url = urlElement.dataset.url;
      showDialog({
        title: `Remove ${optionName} URL?`,
        message: `Remove “${url}” from the ${optionName}?`,
        confirmLabel: 'Remove',
        cancelLabel: 'Keep URL',
        isDanger: true,
        onConfirm: () => {
          getOptions((options) => {
            const urls = options[optionName] || [];
            const urlIndex = urls.indexOf(url);
            if (urlIndex < 0) return;
            urls.splice(urlIndex, 1);
            chrome.storage.local.set({ [optionName]: urls }, () => {
              urlElement.remove();
            });
          });
        },
      });
    });
  }

  function setupAddPhraseListHandler() {
    const colorInput = query<HTMLElement>('#NewPhraseList__color');
    const colorPicker = new Picker({
      alpha: false,
      color: '#BB0000',
      parent: colorInput,
      popup: 'top',
      onDone: (color) => {
        colorInput.style['background-color'] = hexClean(color.hex);
        colorInput.style['color'] = getTextColor(color.hex);
      },
    });
    query('#NewPhraseList__add').addEventListener('click', (e) => {
      e.preventDefault();
      getOptions((options) => {
        const listIndex = options.highlighter.length;
        const listTitle = input('#NewPhraseList__title').value.trim() || 'Untitled';
        const colorStyle = getComputedStyle(colorInput);
        const listColor = rgbaStringToHex(colorStyle.backgroundColor);
        const listTextColor = rgbaStringToHex(colorStyle.color);
        const newList = {
          phrases: [],
          color: listColor,
          textColor: listTextColor,
          title: listTitle,
          enabled: true,
          styles: '',
          allowlist: [],
          denylist: [],
        };
        addNewListDiv(newList, listIndex);
        options.highlighter.push(newList);
        chrome.storage.local.set({ highlighter: options.highlighter }, () => {
          redoAllListStyles(options);
          input('#NewPhraseList__title').value = '';
          applyPhraseSearch();
        });
      });
    });
  }

  function setupPhraseListHandlers(list) {
    setupPhraseListEnabledHandler(list);
    setupPhraseListEditColorHandler(list);
    setupPhraseListEditNameHandler(list);
    setupPhraseListImportHandler(list);
    setupPhraseListExportHandler(list);
    setupPhraseListDeleteHandler(list);
    setupPhraseListAddPhraseHandler(list);
    setupPhraseListDeletePhraseHandler(list);
    setupPhraseListStylesHandler(list);
    setupPhraseListURLHandlers(list);
  }

  function setupPhraseListStylesHandler(list) {
    delegate(list, 'click', '.PhraseList__saveStyles', () => {
      const customStyles = textarea('.PhraseList__customStyles', list).value.trim();
      if (!validateStyleDeclarations(customStyles)) {
        return;
      }
      getOptions((options) => {
        const listIndex = Number(list.dataset.index);
        options.highlighter[listIndex].styles = customStyles;
        chrome.storage.local.set({ highlighter: options.highlighter }, () => {
          redoAllListStyles(options);
          alert('List style saved!');
        });
      });
    });
    delegate(list, 'click', '.PhraseList__resetStyles', () => {
      textarea('.PhraseList__customStyles', list).value = '';
      getOptions((options) => {
        const listIndex = Number(list.dataset.index);
        options.highlighter[listIndex].styles = '';
        chrome.storage.local.set({ highlighter: options.highlighter }, () => {
          redoAllListStyles(options);
        });
      });
    });
  }

  function addPhraseListURLTag(list, urlListName: 'allowlist' | 'denylist', url: string) {
    const urlElement = document.createElement('span');
    urlElement.className = `tag is-medium PhraseList__URL PhraseList__${urlListName}URL`;
    urlElement.dataset.urlList = urlListName;
    urlElement.dataset.url = url;
    urlElement.textContent = url;
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete is-small PhraseList__URLDelete';
    deleteButton.setAttribute('aria-label', `Delete ${url}`);
    urlElement.append(deleteButton);
    query(`.PhraseList__${urlListName}URLs`, list)?.append(urlElement);
  }

  function setupPhraseListURLHandlers(list) {
    delegate(list, 'click', '.PhraseList__URLAdd', (event, target) => {
      event.preventDefault();
      const urlListName = target.dataset.urlList as 'allowlist' | 'denylist';
      const urlInput = input(`.PhraseList__${urlListName}Input`, list);
      const newURL = urlInput.value.trim();
      if (!newURL) return;

      getOptions((options) => {
        const phraseList = options.highlighter[Number(list.dataset.index)];
        const urls = phraseList[urlListName] || [];
        urlInput.value = '';
        if (urls.includes(newURL)) {
          showDialog({
            title: 'Already added',
            message: `That URL is already in this list’s ${urlListName}.`,
          });
          return;
        }
        urls.push(newURL);
        phraseList[urlListName] = urls;
        chrome.storage.local.set({ highlighter: options.highlighter }, () => {
          addPhraseListURLTag(list, urlListName, newURL);
        });
      });
    });

    delegate(list, 'click', '.PhraseList__URLDelete', (_event, target) => {
      const urlElement = target.parentElement;
      const url = urlElement.dataset.url;
      const urlListName = urlElement.dataset.urlList as 'allowlist' | 'denylist';
      showDialog({
        title: `Remove list ${urlListName} URL?`,
        message: `Remove “${url}” from this list’s ${urlListName}?`,
        confirmLabel: 'Remove',
        cancelLabel: 'Keep URL',
        isDanger: true,
        onConfirm: () => {
          getOptions((options) => {
            const urls = options.highlighter[Number(list.dataset.index)][urlListName] || [];
            const urlIndex = urls.indexOf(url);
            if (urlIndex < 0) return;
            urls.splice(urlIndex, 1);
            chrome.storage.local.set({ highlighter: options.highlighter }, () => {
              urlElement.remove();
            });
          });
        },
      });
    });
  }

  function setupPhraseListEnabledHandler(list) {
    delegate(list, 'change', '.PhraseList__enabled', (_event, target) => {
      const listIndex = Number(list.dataset.index);
      const enabled = (target as HTMLInputElement).checked;
      getOptions((options) => {
        options.highlighter[listIndex].enabled = enabled;
        delete options.highlighter[listIndex].toggled;
        chrome.storage.local.set({ highlighter: options.highlighter }, () => {
          list.dataset.enabled = String(enabled);
        });
      });
    });
  }

  function setupPhraseListEditColorHandler(list) {
    const colorButton = query<HTMLElement>('.PhraseList__color', list);
    const currentColor = rgbaStringToHex(getComputedStyle(colorButton).backgroundColor);
    const colorPicker = new Picker({
      alpha: false,
      color: currentColor,
      parent: colorButton,
      popup: 'top',
      onDone: (newColor) => {
        const newColorHexString = hexClean(newColor.hex);
        colorButton.style['background-color'] = newColorHexString;
        colorPicker.setOptions({ color: newColorHexString });
        getOptions((options) => {
          options.highlighter[Number(list.dataset.index)].color = newColorHexString;
          options.highlighter[Number(list.dataset.index)].textColor =
            getTextColor(newColorHexString);
          chrome.storage.local.set({ highlighter: options.highlighter }, () => {
            redoAllListStyles(options);
          });
        });
      },
    });
  }

  function setupPhraseListEditNameHandler(list) {
    delegate(list, 'click', '.PhraseList__editName', () => {
      const oldListName = query('.PhraseList__title', list).textContent;
      showDialog({
        title: 'Rename phrase list',
        message: 'Choose a short name that describes these phrases.',
        confirmLabel: 'Save name',
        cancelLabel: 'Cancel',
        inputValue: oldListName,
        onConfirm: (newListName) => {
          if (newListName && newListName !== oldListName) {
            getOptions((options) => {
              options.highlighter[Number(list.dataset.index)].title = newListName;
              chrome.storage.local.set({ highlighter: options.highlighter }, () => {
                query('.PhraseList__title', list).textContent = newListName;
              });
            });
          }
        },
      });
    });
  }

  function setupPhraseListDeleteHandler(list) {
    delegate(list, 'click', '.PhraseList__delete', () => {
      const oldListName = query('.PhraseList__title', list).textContent;
      showDialog({
        title: 'Delete phrase list?',
        message: `“${oldListName}” and all of its phrases will be permanently deleted.`,
        confirmLabel: 'Delete list',
        cancelLabel: 'Keep list',
        isDanger: true,
        onConfirm: () => {
          getOptions((options) => {
            options.highlighter.splice(Number(list.dataset.index), 1);
            chrome.storage.local.set({ highlighter: options.highlighter }, () => {
              setupOptionsPage(options, false);
            });
          });
        },
      });
    });
  }

  function setupPhraseListAddPhraseHandler(list) {
    delegate(list, 'click', '.PhraseList__newPhrase__add', (e) => {
      e.preventDefault();
      const phraseInput = input('.PhraseList__newPhrase__phrase', list);
      const newPhrase = phraseInput.value.trim();
      if (newPhrase.length > 0) {
        getOptions((options) => {
          const listIndex = Number(list.dataset.index);
          if (options.highlighter[listIndex].phrases.includes(newPhrase)) {
            phraseInput.value = '';
            showDialog({
              title: 'Already added',
              message: 'That phrase is already in this list.',
            });
          } else {
            options.highlighter[listIndex].phrases.push(newPhrase);
            sortStoredPhraseLists(options.highlighter, options.sorting);
            phraseInput.value = '';
            chrome.storage.local.set({ highlighter: options.highlighter }, () => {
              setupOptionsPage(options, false);
            });
          }
        });
      }
    });
  }

  function setupPhraseListDeletePhraseHandler(list) {
    const phrases = query('.PhraseList__phrases', list);
    delegate(phrases, 'click', '.PhraseList__phrase__delete', (_event, target) => {
      const phraseElement = target.parentElement;
      const phrase = phraseElement.dataset.phrase;
      showDialog({
        title: 'Delete phrase?',
        message: `Remove “${phrase}” from this list?`,
        confirmLabel: 'Delete phrase',
        cancelLabel: 'Keep phrase',
        isDanger: true,
        onConfirm: () => {
          getOptions((options) => {
            const listIndex = Number(list.dataset.index);
            const phraseIndex = options.highlighter[listIndex].phrases.indexOf(phrase);
            if (phraseIndex < 0) return;
            options.highlighter[listIndex].phrases.splice(phraseIndex, 1);
            chrome.storage.local.set({ highlighter: options.highlighter }, () => {
              phraseElement.remove();
              decrementPhraseCount(list);
              applyPhraseSearch();
            });
          });
        },
      });
    });
  }

  function setupPhraseListImportHandler(list) {
    delegate(list, 'click', '.PhraseList__import', () => {
      query<HTMLElement>('#ImportModal').dataset.index = list.dataset.index;
      query('#ImportModal__listName').textContent = query('.PhraseList__title', list).textContent;
      textarea('#ImportModal__body').value = '';
      query('#ImportModal__phraseCount').textContent = '0';
      setImportModalTab('Line-Delimited');
      query('#ImportModal').classList.add('is-active');
      textarea('#ImportModal__body').focus();
    });
  }

  function setupPhraseListExportHandler(list) {
    delegate(list, 'click', '.PhraseList__export', () => {
      query('#ExportModal__listName').textContent = query('.PhraseList__title', list).textContent;
      query<HTMLElement>('#ExportModal').dataset.index = list.dataset.index;
      setExportModalTab('Line-Delimited');
      query('#ExportModal').classList.add('is-active');
    });
  }

  function setImportModalTab(tabName) {
    queryAll('#ImportModal__tabs li').forEach((tab) => tab.classList.remove('is-active'));
    query(`#ImportModal__tab--${tabName}`).classList.add('is-active');
    textarea('#ImportModal__body').setAttribute(
      'placeholder',
      `Enter your ${tabName.toLowerCase()} phrase list here.`,
    );
    query('#ImportModal__spaceWarning').classList.toggle(
      'is-hidden',
      tabName !== 'Space-Delimited',
    );
  }

  function setExportModalTab(tabName) {
    queryAll('#ExportModal__tabs li').forEach((tab) => tab.classList.remove('is-active'));
    query(`#ExportModal__tab--${tabName}`).classList.add('is-active');
    getOptions((options) => {
      const listIndex = Number(query<HTMLElement>('#ExportModal').dataset.index);
      const phrases = options.highlighter[listIndex].phrases;
      const delimiter = tabName === 'Line-Delimited' ? '\r\n' : ' ';
      const multiWordPhraseCount = phrases.filter((phrase) => /\s/.test(phrase)).length;

      textarea('#ExportModal__body').value = phrases.join(delimiter);
      query('#ExportModal__phraseCount').textContent = String(phrases.length);
      const warning = query('#ExportModal__spaceWarning');
      warning.classList.toggle('is-hidden', tabName !== 'Space-Delimited');
      const warningBody = query('.message-body', warning);
      warningBody.replaceChildren();
      const warningTitle = document.createElement('b');
      warningTitle.textContent =
        multiWordPhraseCount > 0
          ? `${pluralize(multiWordPhraseCount, 'multi-word phrase')} will not be preserved.`
          : 'Space-delimited exports cannot preserve multi-word phrases.';
      warningBody.append(
        warningTitle,
        document.createTextNode(
          multiWordPhraseCount > 0
            ? ' A space-delimited import treats every word as a separate phrase. Use Line-Delimited for a lossless export.'
            : ' Use Line-Delimited if you add any phrases containing spaces.',
        ),
      );
    });
  }

  /**
   * Given an object represent a preview of the new highlighter list settings after the import,
   * set up the bulk preview modal.
   */
  function setupBulkImportPreviewModal(newHighlighter) {
    const sorting = select('#Settings__sorting').value || 'None';
    sortStoredPhraseLists(newHighlighter, sorting);
    query('#BulkImportPreviewModal__preview').replaceChildren();
    query('#BulkImportPreviewModal__phraseListCount').textContent = String(newHighlighter.length);
    query('#BulkImportPreviewModal__phraseCount').textContent = String(
      newHighlighter.reduce((prev, curr) => prev + curr.phrases.length, 0),
    );
    addExistingLists(
      {
        highlighter: newHighlighter,
        sorting,
      },
      true,
    );
    query('#BulkImportPreviewModal').classList.add('is-active');
    const importButton = query<HTMLButtonElement>('#BulkImportPreviewModal__import');
    const replacement = importButton.cloneNode(true) as HTMLButtonElement;
    importButton.replaceWith(replacement);
    replacement.addEventListener('click', () => {
      chrome.storage.local.set({ highlighter: newHighlighter }, () => {
        getOptions((options) => {
          setupOptionsPage(options, false);
        });
      });
      query('#BulkImportModal').classList.remove('is-active');
      query('#BulkImportPreviewModal').classList.remove('is-active');
      textarea('#BulkImportModal__body').value = '';
      resetBulkImportFile();
    });
  }

  function setupBulkImportModal() {
    query('#BulkImport').addEventListener('click', () => {
      const body = textarea('#BulkImportModal__body');
      body.value = '';
      body.style.opacity = '1';
      resetBulkImportFile();
      query('#BulkImportModal').classList.add('is-active');
    });

    select('#BulkImportModal__typesSelect').addEventListener('change', (e) => {
      queryAll<HTMLElement>('#BulkImportModal__typesInfo > div').forEach((element) =>
        setVisible(element, false),
      );
      const importType = (e.target as HTMLSelectElement).value;
      const importName = query(`#BulkImportModal__typesSelect--${importType}`).textContent.trim();
      setVisible(query(`#BulkImportModal__typesInfo--${importType}`), true);
      query('#BulkImportPreviewModal__optionName').textContent = importName;
    });

    input('#BulkImportModal__fileInput').addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        resetBulkImportFile();
        return;
      }

      const fileExtension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
      if (!['txt', 'json'].includes(fileExtension)) {
        resetBulkImportFile();
        setBulkImportFileStatus('Choose a file ending in .txt or .json.', true);
        return;
      }

      query<HTMLButtonElement>('#BulkImportModal__previewImport').disabled = true;
      const fileStatus = query('#BulkImportModal__fileStatus');
      fileStatus.classList.remove('has-text-danger', 'has-text-success');
      fileStatus.textContent = `Reading ${file.name}…`;
      const reader = new FileReader();
      reader.onload = () => {
        const body = textarea('#BulkImportModal__body');
        body.getAnimations().forEach((animation) => animation.cancel());
        const fadeOut = body.animate({ opacity: [Number(getComputedStyle(body).opacity), 0] }, 100);
        fadeOut.onfinish = () => {
          body.value = String(reader.result || '');
          body.animate({ opacity: [0, 1] }, { duration: 150, fill: 'forwards' });
          query('#BulkImportModal__fileName').textContent = file.name;
          query<HTMLButtonElement>('#BulkImportModal__previewImport').disabled = false;
          setBulkImportFileStatus(`Loaded ${file.name}. Its contents replaced the text below.`);
        };
      };
      reader.onerror = () => {
        resetBulkImportFile();
        setBulkImportFileStatus(`Highlighty could not read ${file.name}.`, true);
      };
      reader.readAsText(file);
    });

    query('#BulkImportModal__previewImport').addEventListener('click', () => {
      const importType = select('#BulkImportModal__typesSelect').value;
      const importBody = textarea('#BulkImportModal__body').value;
      try {
        if (String(importBody).trim().length === 0) {
          throw new Error('Nothing to import.');
        }
        const newImportLists = parseBulkImport(importBody);
        if (importType === 'Replace') {
          setupBulkImportPreviewModal(newImportLists);
        } else if (importType === 'ImportAsNew' || importType === 'ImportAndMerge') {
          getOptions((options) => {
            const existingLists = clonePhraseLists(options.highlighter);
            if (importType === 'ImportAsNew') {
              setupBulkImportPreviewModal(existingLists.concat(newImportLists));
              return;
            }

            const newListsToAppend = [];
            newImportLists.forEach((newList) => {
              const existingList = existingLists.find((list) => list.title === newList.title);
              if (existingList) {
                existingList.phrases = addUniquePhrases(
                  existingList.phrases,
                  newList.phrases,
                ).phrases;
                existingList.color = newList.color;
                existingList.textColor = newList.textColor;
                existingList.enabled = newList.enabled;
                existingList.styles = newList.styles;
                existingList.allowlist = [...newList.allowlist];
                existingList.denylist = [...newList.denylist];
              } else {
                newListsToAppend.push(newList);
              }
            });
            setupBulkImportPreviewModal(existingLists.concat(newListsToAppend));
          });
        } else {
          throw new Error(`Invalid import type: ${importType}.`);
        }
      } catch (error) {
        const nothingToImport = error.message === 'Nothing to import.';
        showDialog({
          title: nothingToImport ? 'Nothing to import' : 'Invalid import data',
          message: nothingToImport
            ? 'Paste a Highlighty bulk export before previewing the import.'
            : `Please use a .txt or .json file created by Bulk Export.\n\nDetails: ${error.message}`,
        });
      }
    });
  }

  function resetBulkImportFile() {
    input('#BulkImportModal__fileInput').value = '';
    query('#BulkImportModal__fileName').textContent = 'No file selected';
    query<HTMLButtonElement>('#BulkImportModal__previewImport').disabled = false;
    setBulkImportFileStatus('');
  }

  function setBulkImportFileStatus(message, isError = false) {
    const status = query('#BulkImportModal__fileStatus');
    status.classList.toggle('has-text-danger', isError);
    status.classList.toggle('has-text-success', Boolean(message) && !isError);
    status.textContent = message;
  }

  function setupBulkExportModal() {
    query('#BulkExport').addEventListener('click', () => {
      query('#BulkExportModal').classList.add('is-active');
      getOptions((options) => {
        const highlighterExport = [];
        let phraseCount = 0;
        Object.values(options.highlighter).forEach((phraseList) => {
          phraseCount += phraseList.phrases.length;
          highlighterExport.push({
            title: phraseList.title,
            color: phraseList.color,
            phrases: phraseList.phrases,
            enabled: phraseList.enabled !== false && phraseList.toggled !== false,
            ...(phraseList.styles ? { styles: phraseList.styles } : {}),
            ...(phraseList.allowlist.length ? { allowlist: phraseList.allowlist } : {}),
            ...(phraseList.denylist.length ? { denylist: phraseList.denylist } : {}),
          });
        });
        const highlightyExportText = JSON.stringify(highlighterExport, null, 2);
        textarea('#BulkExportModal__body').value = highlightyExportText;
        query('#BulkExportModal__phraseListCount').textContent = String(highlighterExport.length);
        query('#BulkExportModal__phraseCount').textContent = String(phraseCount);
        query<HTMLElement>('#BulkExportModal').focus();

        const saveFileBlob = new Blob([highlightyExportText], { type: 'text/plain;charset=utf-8' });
        const download = query<HTMLAnchorElement>('#BulkExportModal__download');
        download.href = URL.createObjectURL(saveFileBlob);
        download.download = 'HighlightyExport' + new Date().toISOString().split('T')[0] + '.txt';
      });
    });

    query('#BulkExportModal__copy').addEventListener('click', () => {
      textarea('#BulkExportModal__body').select();
      document.execCommand('copy');
    });
  }

  function setupImportExportModals() {
    setupImportExportTabHandlers();
    setupImportExportCloseHandlers();
    setupImportExportPhraseCountHandler();
    setupImportSubmitButton();
    setupExportCopyButton();

    setupBulkImportModal();
    setupBulkExportModal();
  }

  function setupImportExportTabHandlers() {
    queryAll('#ImportModal__tabs > li').forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabName = tab.id.split('--')[1];
        setImportModalTab(tabName);
        textarea('#ImportModal__body').dispatchEvent(new Event('input'));
      });
    });
    queryAll('#ExportModal__tabs > li').forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabName = tab.id.split('--')[1];
        setExportModalTab(tabName);
      });
    });
  }

  function setupImportExportCloseHandlers() {
    queryAll('#ImportModal__cancel, #ImportModal__close').forEach((element) => {
      element.addEventListener('click', () => query('#ImportModal').classList.remove('is-active'));
    });
    queryAll('#ExportModal__cancel, #ExportModal__close').forEach((element) => {
      element.addEventListener('click', () => query('#ExportModal').classList.remove('is-active'));
    });
    queryAll('#BulkExportModal__cancel, #BulkExportModal__close').forEach((element) => {
      element.addEventListener('click', () =>
        query('#BulkExportModal').classList.remove('is-active'),
      );
    });
    queryAll('#BulkImportModal__cancel, #BulkImportModal__close').forEach((element) => {
      element.addEventListener('click', () => {
        resetBulkImportFile();
        query('#BulkImportModal').classList.remove('is-active');
      });
    });
    queryAll('#BulkImportPreviewModal__cancel, #BulkImportPreviewModal__close').forEach(
      (element) => {
        element.addEventListener('click', () =>
          query('#BulkImportPreviewModal').classList.remove('is-active'),
        );
      },
    );
  }

  function setupImportExportPhraseCountHandler() {
    textarea('#ImportModal__body').addEventListener('input', () => {
      const importFormat = getActiveDelimitedFormat('ImportModal');
      const phraseCount = getDelimitedPhrases(
        textarea('#ImportModal__body').value,
        importFormat,
      ).length;
      query('#ImportModal__phraseCount').textContent = String(phraseCount);
    });
  }

  function getActiveDelimitedFormat(modalId) {
    return query(`#${modalId}__tabs li.is-active`).id.split('--')[1];
  }

  function setupImportSubmitButton() {
    query('#ImportModal__submit').addEventListener('click', () => {
      const importFormat = getActiveDelimitedFormat('ImportModal');
      const phrasesToAdd = getDelimitedPhrases(textarea('#ImportModal__body').value, importFormat);
      if (phrasesToAdd.length > 0) {
        getOptions((options) => {
          const listIndex = Number(query<HTMLElement>('#ImportModal').dataset.index);
          const result = addUniquePhrases(options.highlighter[listIndex].phrases, phrasesToAdd);
          options.highlighter[listIndex].phrases = result.phrases;
          const phrasesAdded = result.added;
          const phrasesSkipped = result.skipped;
          sortStoredPhraseLists(options.highlighter, options.sorting);
          chrome.storage.local.set({ highlighter: options.highlighter }, () => {
            setupOptionsPage(options, false);
            let alertMessage = `${pluralize(phrasesAdded, 'phrase')} added.`;
            if (phrasesSkipped > 0) {
              alertMessage += `\n${pluralize(
                phrasesSkipped,
                'phrase',
              )} skipped due to already being in the list.`;
            }
            showDialog({
              title: 'Import complete',
              message: alertMessage,
            });
          });
        });
      }
      query('#ImportModal').classList.remove('is-active');
    });
  }

  function setupExportCopyButton() {
    query('#ExportModal__copy').addEventListener('click', () => {
      textarea('#ExportModal__body').select();
      document.execCommand('copy');
    });
  }

  getOptions((options) => {
    setupOptionsPage(options);
  });

  query('#Settings__save').addEventListener('click', () => {
    getOptions((options) => {
      const newEnableAutoHighlight = input('#Settings__enableAutoHighlight').checked;
      const newEnableAutoHighlightUpdates = input('#Settings__enableAutoHighlightUpdates').checked;
      const newEnableTitleMouseover = input('#Settings__enableTitleMouseover').checked;
      const newEnablePartialMatch = input('#Settings__enablePartialMatch').checked;
      const newEnableCaseInsensitive = input('#Settings__enableCaseInsensitive').checked;
      const newEnablePhraseNavigator = input('#Settings__enablePhraseNavigator').checked;
      const newEnableQuickSearch = input('#Settings__enableQuickSearch').checked;
      const newKeyboardShortcut = input('#Settings__keyboardShortcut').value;
      const newEnableURLDenylist = input('#Settings__enableURLDenylist').checked;
      const newEnableURLAllowlist = input('#Settings__enableURLAllowlist').checked;
      const newSorting = normalizeSortOrder(select('#Settings__sorting').value);
      const newBaseStyles = textarea('#Settings__baseStyles').value.trim();

      if (!validateStyleDeclarations(newBaseStyles)) {
        return;
      }

      const newOptions = {
        ...options,
        enableAutoHighlight: newEnableAutoHighlight,
        enableAutoHighlightUpdates: newEnableAutoHighlightUpdates,
        enableTitleMouseover: newEnableTitleMouseover,
        enablePartialMatch: newEnablePartialMatch,
        enableCaseInsensitive: newEnableCaseInsensitive,
        enablePhraseNavigator: newEnablePhraseNavigator,
        enableQuickSearch: newEnableQuickSearch,
        enableURLDenylist: newEnableURLDenylist,
        enableURLAllowlist: newEnableURLAllowlist,
        keyboardShortcut: newKeyboardShortcut,
        sorting: newSorting,
        baseStyles: newBaseStyles,
      };
      sortStoredPhraseLists(newOptions.highlighter, newSorting);

      if (newEnableAutoHighlight !== options.enableAutoHighlight) {
        newOptions.autoHighlighter = newEnableAutoHighlight;
      }

      chrome.storage.local.set(newOptions, () => {
        if (chrome.runtime.lastError) {
          const status = query('#Settings__saveStatus');
          status.classList.remove('is-light', 'is-warning');
          status.classList.add('is-danger');
          status.textContent = 'Settings could not be saved';
          return;
        }
        setSettingsDirty(false);
        showDialog({
          title: 'Settings saved',
          message: 'Your Highlighty settings are up to date.',
        });
        setupOptionsPage(newOptions, false);
      });
    });
  });

  function pluralize(count, noun, suffix = 's') {
    return `${count} ${noun}${count !== 1 ? suffix : ''}`;
  }

  function validateStyleDeclarations(styles) {
    const valid = isValidStyleDeclarations(styles);
    if (!valid) {
      alert(
        'Styles must contain CSS declarations only. Braces, comments, markup, imports, URLs, and expressions are not allowed.',
      );
    }
    return valid;
  }
});
