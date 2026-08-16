/* Highlighty.js | by Stephen Wu */

import { getTextColor, hexClean, rgbaStringToHex } from './modules/colors';
import { getDelimitedPhrases, parseBulkImport } from './modules/import-export';
import { shortcutFromKeyboardEvent } from './modules/keyboard';
import {
  addUniquePhrases,
  clonePhraseLists,
  sortPhrases,
  sortStoredPhraseLists,
} from './modules/phrase-lists';
import { DEFAULT_BASE_STYLES, normalizeOptions } from './modules/storage';
import { validateStyleDeclarations as isValidStyleDeclarations } from './modules/styles';
import type { HighlightyOptions } from './modules/types';

$(function () {
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
    const $modal = $('#DialogModal');
    const $confirm = $('#DialogModal__confirm');
    const $cancel = $('#DialogModal__cancel');
    const $inputField = $('#DialogModal__inputField');
    const $input = $('#DialogModal__input');
    const previouslyFocused = document.activeElement;
    const hasInput = typeof inputValue === 'string';

    $('#DialogModal__title').text(title);
    $('#DialogModal__message').text(message);
    $confirm
      .text(confirmLabel)
      .toggleClass('is-link', !isDanger)
      .toggleClass('is-danger', isDanger);
    $cancel.text(cancelLabel || 'Cancel').toggle(Boolean(cancelLabel));
    $inputField.toggle(hasInput);
    $input.val(hasInput ? inputValue : '');

    function closeDialog() {
      $modal.removeClass('is-active').attr('aria-hidden', 'true');
      $(document).off('keydown.highlightyDialog');
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    }

    $confirm.off('click.highlightyDialog').on('click.highlightyDialog', () => {
      const value = hasInput ? String($input.val() ?? '').trim() : undefined;
      closeDialog();
      onConfirm(value);
    });
    $('#DialogModal__cancel, #DialogModal__close, #DialogModal .modal-background')
      .off('click.highlightyDialog')
      .on('click.highlightyDialog', closeDialog);
    $(document)
      .off('keydown.highlightyDialog')
      .on('keydown.highlightyDialog', (e) => {
        if (e.key === 'Escape') {
          closeDialog();
        } else if (e.key === 'Enter' && (hasInput || document.activeElement === $confirm[0])) {
          e.preventDefault();
          $confirm.trigger('click');
        }
      });

    $modal.addClass('is-active').attr('aria-hidden', 'false');
    if (hasInput) {
      $input.focus().select();
    } else {
      $confirm.focus();
    }
  }

  function removeExistingLists() {
    // This will also remove all associated handlers in the phrase list
    $('#PhraseLists__results .PhraseList').not('#PhraseList--invisible').remove();
  }

  function removeExistingListStyles() {
    $('#HighlighterStyles').remove();
  }

  function redoAllListStyles(options) {
    removeExistingListStyles();
    addExistingListStyles(options);
  }

  function setPrimarySettings(options) {
    $('#Settings__enableAutoHighlight').prop('checked', options.enableAutoHighlight);
    $('#Settings__enableAutoHighlightUpdates').prop('checked', options.enableAutoHighlightUpdates);
    $('#Settings__enableTitleMouseover').prop('checked', options.enableTitleMouseover);
    $('#Settings__enablePartialMatch').prop('checked', options.enablePartialMatch);
    $('#Settings__enableCaseInsensitive').prop('checked', options.enableCaseInsensitive);
    $('#Settings__enablePhraseNavigator').prop('checked', options.enablePhraseNavigator);
    $('#Settings__enableQuickSearch').prop('checked', options.enableQuickSearch);
    $('#Settings__keyboardShortcut').val(options.keyboardShortcut);
    $('#Settings__enableURLDenylist').prop('checked', options.enableURLDenylist);
    $('#Settings__enableURLAllowlist').prop('checked', options.enableURLAllowlist);
    $('#Settings__sorting').val(options.sorting);
    $('#Settings__baseStyles').val(options.baseStyles);
    showHideAutoHighlightSettings();
    setSettingsDirty(false);
  }

  function showHideAutoHighlightSettings() {
    if ($('#Settings__enableAutoHighlight').is(':checked')) {
      $('#Settings__AutoHighlight').show();
    } else {
      $('#Settings__AutoHighlight').hide();
    }
  }

  function setupAutoHighlightHandler() {
    $('#Settings__enableAutoHighlight').on('click', function () {
      showHideAutoHighlightSettings();
    });
  }

  function setupOptionalSettingsHandlers() {
    $('#Settings__resetBaseStyles').on('click', () => {
      $('#Settings__baseStyles').val(DEFAULT_BASE_STYLES).trigger('change');
    });
  }

  function setSettingsDirty(isDirty) {
    settingsDirty = isDirty;
    $('#Settings__save').prop('disabled', !isDirty);
    $('#Settings__saveStatus')
      .removeClass('is-danger')
      .toggleClass('is-light', !isDirty)
      .toggleClass('is-warning', isDirty)
      .text(isDirty ? 'Unsaved settings' : 'All settings saved');
  }

  function setupUnsavedSettingsHandlers() {
    $('#Settings').on('change', settingsInputSelector, () => {
      setSettingsDirty(true);
    });
    window.addEventListener('beforeunload', (event) => {
      if (!settingsDirty) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  function setupKeyboardShortcutHandler(savedShortcut) {
    const keyboardShortcutInput = $('#Settings__keyboardShortcut');

    function updateShortcutInput(shortcutString, isUserChange = false) {
      const previousShortcut = keyboardShortcutInput.val();
      keyboardShortcutInput.val(shortcutString);
      keyboardShortcutInput.width((shortcutString.length + 6) * 5);
      if (isUserChange && previousShortcut !== shortcutString) {
        setSettingsDirty(true);
      }
    }

    function stopRecording() {
      document.getElementById('Settings__keyboardShortcut').setAttribute('data-recording', 'false');
      document.removeEventListener('keydown', handleKeyDown);
    }

    updateShortcutInput(savedShortcut);

    keyboardShortcutInput.on('focus', () => {
      document.getElementById('Settings__keyboardShortcut').setAttribute('data-recording', 'true');
      document.addEventListener('keydown', handleKeyDown);
    });

    keyboardShortcutInput.on('blur', () => {
      stopRecording();
    });

    function handleKeyDown(e) {
      if (e.key === 'Enter') {
        keyboardShortcutInput.blur();
        return;
      }
      if (e.key === 'Escape') {
        keyboardShortcutInput.blur();
        updateShortcutInput('', true);
        return;
      }
      e.preventDefault();
      updateShortcutInput(shortcutFromKeyboardEvent(e), true);
    }
  }

  function setupSearchPhraseListsHandler() {
    $('#PhraseLists__search').on('input', applyPhraseSearch);
  }

  function applyPhraseSearch() {
    const searchText = String($('#PhraseLists__search').val() || '')
      .trim()
      .toLowerCase();
    let matchingPhraseCount = 0;
    let matchingListCount = 0;

    $('#PhraseLists__results .PhraseList')
      .not('#PhraseList--invisible')
      .each(function () {
        const $list = $(this);
        let listMatchCount = 0;
        $list.find('.PhraseList__phrase').each(function () {
          const $phrase = $(this);
          const phraseText = String($phrase.data('phrase') || $phrase.text()).toLowerCase();
          const matches = searchText.length === 0 || phraseText.includes(searchText);
          $phrase.toggle(matches);
          if (matches) listMatchCount++;
        });
        const listMatches = searchText.length === 0 || listMatchCount > 0;
        $list.toggle(listMatches);
        if (listMatches) {
          matchingListCount++;
          matchingPhraseCount += listMatchCount;
        }
      });

    $('#PhraseLists__noResults').toggleClass(
      'is-hidden',
      searchText.length === 0 || matchingPhraseCount > 0,
    );
    $('#PhraseLists__searchSummary').text(
      searchText.length === 0
        ? `${pluralize(matchingPhraseCount, 'phrase')} in ${pluralize(matchingListCount, 'list')}`
        : `${pluralize(matchingPhraseCount, 'matching phrase')} in ${pluralize(
            matchingListCount,
            'list',
          )}`,
    );
  }

  function addExistingURLLists(options) {
    (options.denylist || []).forEach((url) => addURLListElement('Denylist', url));
    (options.allowlist || []).forEach((url) => addURLListElement('Allowlist', url));
  }

  function addURLListElement(listName, url) {
    const $url = $('<span>').addClass(`tag is-medium ${listName}__url`).data('url', url).text(url);
    $('<button>')
      .addClass(`delete is-small ${listName}__url__delete`)
      .attr('aria-label', `Delete ${url}`)
      .appendTo($url);
    $(`#${listName}__urls`).append($url);
  }

  function addExistingListStyles(options) {
    let highlighterStyles = `span.PhraseList__phrase, span.Denylist__url { ${options.baseStyles} }\r\n`;
    for (let i = 0; i < options.highlighter.length; i++) {
      const {
        color: highlighterColor = 'black',
        textColor = 'white',
        styles: customStyles = '',
      } = options.highlighter[i];
      $(`#PhraseList--${i} .PhraseList__phraseCount`).css({
        backgroundColor: highlighterColor,
        color: textColor,
      });
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
      const $newListDiv = addNewListDiv(highlighter[i], i, isImportPreview);
      const sortedList = sortPhrases(highlighter[i].phrases, sorting);
      for (const phrase of sortedList) {
        if (isImportPreview) {
          addPreviewPhraseElement($newListDiv, phrase, highlighter[i].color);
        } else {
          addPhraseElement($newListDiv, phrase, i, false);
        }
      }
    }
  }

  function addNewListDiv(list, index, isImportPreview = false) {
    const enabled = list.enabled !== false && list.toggled !== false;
    const $newListDiv = $(
      !isImportPreview ? '#PhraseList--invisible' : '#PhraseListPreview--invisible',
    )
      .clone()
      .attr('id', `PhraseList--${index}`)
      .attr('data-enabled', String(enabled))
      .data('index', index);
    $newListDiv.find('.PhraseList__color').css('background-color', list.color);
    $newListDiv.find('.PhraseList__title').text(list.title);
    $newListDiv.find('.PhraseList__phraseCount').text('0 phrases');
    $newListDiv.find('.PhraseList__customStyles').val(list.styles || '');
    const toggleId = `PhraseList__enabled--${index}`;
    $newListDiv.find('.PhraseList__enabled').attr('id', toggleId).prop('checked', enabled);
    $newListDiv.find('.PhraseList__enabledLabel').attr('for', toggleId);
    if (isImportPreview) {
      $('#BulkImportPreviewModal__preview').append($newListDiv);
    } else {
      setupPhraseListHandlers($newListDiv);
      $newListDiv.insertBefore('#PhraseList--invisible');
    }
    return $newListDiv;
  }

  function addPhraseElement($listDiv, phrase, listIndex, updateSearch = true) {
    const $phrase = $('<span>')
      .addClass(`tag is-medium PhraseList__phrase PhraseList__phrase--${listIndex}`)
      .attr('data-list', listIndex)
      .data('phrase', phrase)
      .text(phrase);
    $('<button>')
      .addClass('delete is-small PhraseList__phrase__delete')
      .attr('aria-label', `Delete ${phrase}`)
      .appendTo($phrase);
    $listDiv.find('.PhraseList__phrases').append($phrase);
    incrementPhraseCount($listDiv);
    if (updateSearch) applyPhraseSearch();
  }

  function incrementPhraseCount($listDiv) {
    const $phraseCount = $listDiv.find('.PhraseList__phraseCount');
    // Defaults to 0 if data-count attribute not set
    let phraseCount = parseInt($phraseCount.data('count') || 0, 10);
    phraseCount++;
    $phraseCount.data('count', phraseCount);
    $phraseCount.text(`${phraseCount} phrase${phraseCount !== 1 ? 's' : ''}`);
  }

  function decrementPhraseCount($listDiv) {
    const $phraseCount = $listDiv.find('.PhraseList__phraseCount');
    let phraseCount = parseInt($phraseCount.data('count') || 0, 10);
    phraseCount = Math.max(0, phraseCount - 1);
    $phraseCount.data('count', phraseCount);
    $phraseCount.text(`${phraseCount} phrase${phraseCount !== 1 ? 's' : ''}`);
  }

  function addPreviewPhraseElement($listDiv, phrase, color) {
    const textColor = getTextColor(color);
    $('<span>')
      .addClass('tag is-medium PhraseList__phrase')
      .data('phrase', phrase)
      .css({ backgroundColor: color, color: textColor })
      .text(phrase)
      .appendTo($listDiv.find('.PhraseList__phrases'));
  }

  function setupURLListHandlers() {
    setupURLListHandler('Denylist', 'denylist');
    setupURLListHandler('Allowlist', 'allowlist');
    $('#Settings').on('click', '#Settings__enableURLDenylist', () => {
      $('#Settings__enableURLAllowlist').prop('checked', false);
    });
    $('#Settings').on('click', '#Settings__enableURLAllowlist', () => {
      $('#Settings__enableURLDenylist').prop('checked', false);
    });
  }

  function setupURLListHandler(listName, optionName) {
    $(`#${listName}__add`).on('click', (event) => {
      event.preventDefault();
      const $input = $(`#${listName}__urlInput`);
      const newURL = String($input.val() || '').trim();
      if (!newURL) return;

      getOptions((options) => {
        const urls = options[optionName] || [];
        $input.val('');
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

    $('#Settings').on('click', `.${listName}__url__delete`, (event) => {
      const $url = $(event.target).parent();
      const url = $url.data('url');
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
              $url.remove();
            });
          });
        },
      });
    });
  }

  function setupAddPhraseListHandler() {
    const colorInput = $('#NewPhraseList__color')[0];
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
    $('#NewPhraseList__add').on('click', (e) => {
      e.preventDefault();
      getOptions((options) => {
        const listIndex = options.highlighter.length;
        const listTitle = String($('#NewPhraseList__title').val() || '').trim() || 'Untitled';
        const listColor = rgbaStringToHex($('#NewPhraseList__color').css('background-color'));
        const listTextColor = rgbaStringToHex($('#NewPhraseList__color').css('color'));
        const newList = {
          phrases: [],
          color: listColor,
          textColor: listTextColor,
          title: listTitle,
          enabled: true,
          styles: '',
        };
        addNewListDiv(newList, listIndex);
        options.highlighter.push(newList);
        chrome.storage.local.set({ highlighter: options.highlighter }, () => {
          redoAllListStyles(options);
          $('#NewPhraseList__title').val('');
          applyPhraseSearch();
        });
      });
    });
  }

  function setupPhraseListHandlers($list) {
    setupPhraseListEnabledHandler($list);
    setupPhraseListEditColorHandler($list);
    setupPhraseListEditNameHandler($list);
    setupPhraseListImportHandler($list);
    setupPhraseListExportHandler($list);
    setupPhraseListDeleteHandler($list);
    setupPhraseListAddPhraseHandler($list);
    setupPhraseListDeletePhraseHandler($list);
    setupPhraseListStylesHandler($list);
  }

  function setupPhraseListStylesHandler($list) {
    $list.on('click', '.PhraseList__saveStyles', () => {
      const customStyles = String($list.find('.PhraseList__customStyles').val() || '').trim();
      if (!validateStyleDeclarations(customStyles)) {
        return;
      }
      getOptions((options) => {
        const listIndex = $list.data('index');
        options.highlighter[listIndex].styles = customStyles;
        chrome.storage.local.set({ highlighter: options.highlighter }, () => {
          redoAllListStyles(options);
          alert('List style saved!');
        });
      });
    });
    $list.on('click', '.PhraseList__resetStyles', () => {
      $list.find('.PhraseList__customStyles').val('');
      getOptions((options) => {
        const listIndex = $list.data('index');
        options.highlighter[listIndex].styles = '';
        chrome.storage.local.set({ highlighter: options.highlighter }, () => {
          redoAllListStyles(options);
        });
      });
    });
  }

  function setupPhraseListEnabledHandler($list) {
    $list.on('change', '.PhraseList__enabled', (event) => {
      const listIndex = $list.data('index');
      const enabled = $(event.currentTarget).is(':checked');
      getOptions((options) => {
        options.highlighter[listIndex].enabled = enabled;
        delete options.highlighter[listIndex].toggled;
        chrome.storage.local.set({ highlighter: options.highlighter }, () => {
          $list.attr('data-enabled', String(enabled));
        });
      });
    });
  }

  function setupPhraseListEditColorHandler($list) {
    const currentColor = rgbaStringToHex($list.find('.PhraseList__color').css('background-color'));
    const colorButton = $list.find('.PhraseList__color')[0];
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
          options.highlighter[$list.data('index')].color = newColorHexString;
          options.highlighter[$list.data('index')].textColor = getTextColor(newColorHexString);
          chrome.storage.local.set({ highlighter: options.highlighter }, () => {
            redoAllListStyles(options);
          });
        });
      },
    });
  }

  function setupPhraseListEditNameHandler($list) {
    $list.on('click', '.PhraseList__editName', () => {
      const oldListName = $list.find('.PhraseList__title').text();
      showDialog({
        title: 'Rename phrase list',
        message: 'Choose a short name that describes these phrases.',
        confirmLabel: 'Save name',
        cancelLabel: 'Cancel',
        inputValue: oldListName,
        onConfirm: (newListName) => {
          if (newListName && newListName !== oldListName) {
            getOptions((options) => {
              options.highlighter[$list.data('index')].title = newListName;
              chrome.storage.local.set({ highlighter: options.highlighter }, () => {
                $list.find('.PhraseList__title').text(newListName);
              });
            });
          }
        },
      });
    });
  }

  function setupPhraseListDeleteHandler($list) {
    $list.on('click', '.PhraseList__delete', () => {
      const oldListName = $list.find('.PhraseList__title').text();
      showDialog({
        title: 'Delete phrase list?',
        message: `“${oldListName}” and all of its phrases will be permanently deleted.`,
        confirmLabel: 'Delete list',
        cancelLabel: 'Keep list',
        isDanger: true,
        onConfirm: () => {
          getOptions((options) => {
            options.highlighter.splice($list.data('index'), 1);
            chrome.storage.local.set({ highlighter: options.highlighter }, () => {
              setupOptionsPage(options, false);
            });
          });
        },
      });
    });
  }

  function setupPhraseListAddPhraseHandler($list) {
    $list.on('click', '.PhraseList__newPhrase__add', (e) => {
      e.preventDefault();
      const $input = $list.find('.PhraseList__newPhrase__phrase');
      const newPhrase = String($input.val() || '').trim();
      if (newPhrase.length > 0) {
        getOptions((options) => {
          const listIndex = $list.data('index');
          if (options.highlighter[listIndex].phrases.includes(newPhrase)) {
            $input.val('');
            showDialog({
              title: 'Already added',
              message: 'That phrase is already in this list.',
            });
          } else {
            options.highlighter[listIndex].phrases.push(newPhrase);
            sortStoredPhraseLists(options.highlighter, options.sorting);
            $input.val('');
            chrome.storage.local.set({ highlighter: options.highlighter }, () => {
              setupOptionsPage(options, false);
            });
          }
        });
      }
    });
  }

  function setupPhraseListDeletePhraseHandler($list) {
    const $phrases = $list.find('.PhraseList__phrases');
    $phrases.on('click', '.PhraseList__phrase__delete', (e) => {
      const $phrase = $(e.target).parent();
      const phrase = $phrase.data('phrase');
      showDialog({
        title: 'Delete phrase?',
        message: `Remove “${phrase}” from this list?`,
        confirmLabel: 'Delete phrase',
        cancelLabel: 'Keep phrase',
        isDanger: true,
        onConfirm: () => {
          getOptions((options) => {
            const listIndex = $list.data('index');
            const phraseIndex = options.highlighter[listIndex].phrases.indexOf(phrase);
            if (phraseIndex < 0) return;
            options.highlighter[listIndex].phrases.splice(phraseIndex, 1);
            chrome.storage.local.set({ highlighter: options.highlighter }, () => {
              $phrase.remove();
              decrementPhraseCount($list);
              applyPhraseSearch();
            });
          });
        },
      });
    });
  }

  function setupPhraseListImportHandler($list) {
    $list.on('click', '.PhraseList__import', (e) => {
      $('#ImportModal').data('index', $list.data('index'));
      $('#ImportModal__listName').text($list.find('.PhraseList__title').text());
      $('#ImportModal__body').val('');
      $('#ImportModal__phraseCount').text('0');
      setImportModalTab('Line-Delimited');
      $('#ImportModal').addClass('is-active');
      $('#ImportModal__body').focus();
    });
  }

  function setupPhraseListExportHandler($list) {
    $list.on('click', '.PhraseList__export', (e) => {
      $('#ExportModal__listName').text($list.find('.PhraseList__title').text());
      $('#ExportModal').data('index', $list.data('index'));
      setExportModalTab('Line-Delimited');
      $('#ExportModal').addClass('is-active');
    });
  }

  function setImportModalTab(tabName) {
    $('#ImportModal__tabs').find('li').removeClass('is-active');
    $('#ImportModal__tabs').find(`#ImportModal__tab--${tabName}`).addClass('is-active');
    $('#ImportModal__body').attr(
      'placeholder',
      `Enter your ${tabName.toLowerCase()} phrase list here.`,
    );
    $('#ImportModal__spaceWarning').toggleClass('is-hidden', tabName !== 'Space-Delimited');
  }

  function setExportModalTab(tabName) {
    $('#ExportModal__tabs').find('li').removeClass('is-active');
    $('#ExportModal__tabs').find(`#ExportModal__tab--${tabName}`).addClass('is-active');
    getOptions((options) => {
      const listIndex = $('#ExportModal').data('index');
      const phrases = options.highlighter[listIndex].phrases;
      const delimiter = tabName === 'Line-Delimited' ? '\r\n' : ' ';
      const multiWordPhraseCount = phrases.filter((phrase) => /\s/.test(phrase)).length;

      $('#ExportModal__body').val(phrases.join(delimiter));
      $('#ExportModal__phraseCount').text(phrases.length);
      const $warning = $('#ExportModal__spaceWarning').toggleClass(
        'is-hidden',
        tabName !== 'Space-Delimited',
      );
      const $warningBody = $warning.find('.message-body').empty();
      $('<b>')
        .text(
          multiWordPhraseCount > 0
            ? `${pluralize(multiWordPhraseCount, 'multi-word phrase')} will not be preserved.`
            : 'Space-delimited exports cannot preserve multi-word phrases.',
        )
        .appendTo($warningBody);
      $warningBody.append(
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
    const sorting = $('#Settings__sorting').val() || 'None';
    sortStoredPhraseLists(newHighlighter, sorting);
    $('#BulkImportPreviewModal__preview').empty();
    $('#BulkImportPreviewModal__phraseListCount').text(newHighlighter.length);
    $('#BulkImportPreviewModal__phraseCount').text(
      newHighlighter.reduce((prev, curr) => prev + curr.phrases.length, 0),
    );
    addExistingLists(
      {
        highlighter: newHighlighter,
        sorting,
      },
      true,
    );
    $('#BulkImportPreviewModal').addClass('is-active');
    $('#BulkImportPreviewModal__import').off('click');
    $('#BulkImportPreviewModal__import').on('click', () => {
      chrome.storage.local.set({ highlighter: newHighlighter }, () => {
        getOptions((options) => {
          setupOptionsPage(options, false);
        });
      });
      $('#BulkImportModal').removeClass('is-active');
      $('#BulkImportPreviewModal').removeClass('is-active');
      $('#BulkImportModal__body').val('');
      resetBulkImportFile();
    });
  }

  function setupBulkImportModal() {
    $('#BulkImport').on('click', () => {
      $('#BulkImportModal__body').val('').css('opacity', 1);
      resetBulkImportFile();
      $('#BulkImportModal').addClass('is-active');
    });

    $('#BulkImportModal__typesSelect').change((e) => {
      $('#BulkImportModal__typesInfo > div').hide();
      const importType = (e.target as HTMLSelectElement).value;
      const importName = $(`#BulkImportModal__typesSelect--${importType}`).text().trim();
      $(`#BulkImportModal__typesInfo--${importType}`).show();
      $('#BulkImportPreviewModal__optionName').text(importName);
    });

    $('#BulkImportModal__fileInput').on('change', (event) => {
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

      $('#BulkImportModal__previewImport').prop('disabled', true);
      $('#BulkImportModal__fileStatus')
        .removeClass('has-text-danger has-text-success')
        .text(`Reading ${file.name}…`);
      const reader = new FileReader();
      reader.onload = () => {
        const $body = $('#BulkImportModal__body');
        $body.stop(true, true).fadeTo(100, 0, () => {
          $body.val(String(reader.result || '')).fadeTo(150, 1);
          $('#BulkImportModal__fileName').text(file.name);
          $('#BulkImportModal__previewImport').prop('disabled', false);
          setBulkImportFileStatus(`Loaded ${file.name}. Its contents replaced the text below.`);
        });
      };
      reader.onerror = () => {
        resetBulkImportFile();
        setBulkImportFileStatus(`Highlighty could not read ${file.name}.`, true);
      };
      reader.readAsText(file);
    });

    $('#BulkImportModal__previewImport').on('click', () => {
      const importType = $('#BulkImportModal__typesSelect').val();
      const importBody = $('#BulkImportModal__body').val();
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
    $('#BulkImportModal__fileInput').val('');
    $('#BulkImportModal__fileName').text('No file selected');
    $('#BulkImportModal__previewImport').prop('disabled', false);
    setBulkImportFileStatus('');
  }

  function setBulkImportFileStatus(message, isError = false) {
    $('#BulkImportModal__fileStatus')
      .toggleClass('has-text-danger', isError)
      .toggleClass('has-text-success', Boolean(message) && !isError)
      .text(message);
  }

  function setupBulkExportModal() {
    $('#BulkExport').on('click', () => {
      $('#BulkExportModal').addClass('is-active');
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
          });
        });
        const highlightyExportText = JSON.stringify(highlighterExport, null, 2);
        $('#BulkExportModal__body').val(highlightyExportText);
        $('#BulkExportModal__phraseListCount').text(highlighterExport.length);
        $('#BulkExportModal__phraseCount').text(phraseCount);
        $('#BulkExportModal').focus();

        const saveFileBlob = new Blob([highlightyExportText], { type: 'text/plain;charset=utf-8' });
        $('#BulkExportModal__download').attr('href', URL.createObjectURL(saveFileBlob));
        $('#BulkExportModal__download').attr(
          'download',
          'HighlightyExport' + new Date().toISOString().split('T')[0] + '.txt',
        );
      });
    });

    $('#BulkExportModal__copy').on('click', () => {
      $('#BulkExportModal__body').select();
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
    $('#ImportModal__tabs > li').on('click', (e) => {
      const tabName = e.currentTarget.id.split('--')[1];
      setImportModalTab(tabName);
      $('#ImportModal__body').trigger('input');
    });
    $('#ExportModal__tabs > li').on('click', (e) => {
      const tabName = e.currentTarget.id.split('--')[1];
      setExportModalTab(tabName);
    });
  }

  function setupImportExportCloseHandlers() {
    $('#ImportModal__cancel, #ImportModal__close').on('click', () => {
      $('#ImportModal').removeClass('is-active');
    });
    $('#ExportModal__cancel, #ExportModal__close').on('click', () => {
      $('#ExportModal').removeClass('is-active');
    });
    $('#BulkExportModal__cancel, #BulkExportModal__close').on('click', () => {
      $('#BulkExportModal').removeClass('is-active');
    });
    $('#BulkImportModal__cancel, #BulkImportModal__close').on('click', () => {
      resetBulkImportFile();
      $('#BulkImportModal').removeClass('is-active');
    });
    $('#BulkImportPreviewModal__cancel, #BulkImportPreviewModal__close').on('click', () => {
      $('#BulkImportPreviewModal').removeClass('is-active');
    });
  }

  function setupImportExportPhraseCountHandler() {
    $('#ImportModal__body').on('input', () => {
      const importFormat = getActiveDelimitedFormat('ImportModal');
      const phraseCount = getDelimitedPhrases($('#ImportModal__body').val(), importFormat).length;
      $('#ImportModal__phraseCount').text(phraseCount);
    });
  }

  function getActiveDelimitedFormat(modalId) {
    return $(`#${modalId}__tabs li.is-active`).attr('id').split('--')[1];
  }

  function setupImportSubmitButton() {
    $('#ImportModal__submit').on('click', () => {
      const importFormat = getActiveDelimitedFormat('ImportModal');
      const phrasesToAdd = getDelimitedPhrases($('#ImportModal__body').val(), importFormat);
      if (phrasesToAdd.length > 0) {
        getOptions((options) => {
          const listIndex = $('#ImportModal').data('index');
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
      $('#ImportModal').removeClass('is-active');
    });
  }

  function setupExportCopyButton() {
    $('#ExportModal__copy').on('click', () => {
      $('#ExportModal__body').select();
      document.execCommand('copy');
    });
  }

  getOptions((options) => {
    setupOptionsPage(options);
  });

  $('#Settings__save').on('click', () => {
    getOptions((options) => {
      const newEnableAutoHighlight = $('#Settings__enableAutoHighlight').is(':checked');
      const newEnableAutoHighlightUpdates = $('#Settings__enableAutoHighlightUpdates').is(
        ':checked',
      );
      const newEnableTitleMouseover = $('#Settings__enableTitleMouseover').is(':checked');
      const newEnablePartialMatch = $('#Settings__enablePartialMatch').is(':checked');
      const newEnableCaseInsensitive = $('#Settings__enableCaseInsensitive').is(':checked');
      const newEnablePhraseNavigator = $('#Settings__enablePhraseNavigator').is(':checked');
      const newEnableQuickSearch = $('#Settings__enableQuickSearch').is(':checked');
      const newKeyboardShortcut = $('#Settings__keyboardShortcut').val();
      const newEnableURLDenylist = $('#Settings__enableURLDenylist').is(':checked');
      const newEnableURLAllowlist = $('#Settings__enableURLAllowlist').is(':checked');
      const newSorting = $('#Settings__sorting').val();
      const newBaseStyles = String($('#Settings__baseStyles').val() || '').trim();

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
          $('#Settings__saveStatus')
            .removeClass('is-light is-warning')
            .addClass('is-danger')
            .text('Settings could not be saved');
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
