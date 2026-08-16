/* Highlighty.js | by Stephen Wu */

$(function () {
  const settingsInputSelector = [
    '#Settings__enableAutoHighlight',
    '#Settings__enableAutoHighlightUpdates',
    '#Settings__enableTitleMouseover',
    '#Settings__enablePartialMatch',
    '#Settings__enableCaseInsensitive',
    '#Settings__keyboardShortcut',
    '#Settings__enableURLDenylist',
    '#Settings__enableURLAllowlist',
    '#Settings__sorting',
  ].join(', ');
  let settingsDirty = false;

  /**
   * Set up or reset the options page handlers and lists components.
   * If fresh is false, then don't run the one-time handlers setup meant for a fresh load.
   */
  function setupOptionsPage(options, fresh = true) {
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
    $('#Settings__keyboardShortcut').val(options.keyboardShortcut);
    $('#Settings__enableURLDenylist').prop('checked', options.enableURLDenylist);
    $('#Settings__enableURLAllowlist').prop('checked', options.enableURLAllowlist);
    $('#Settings__sorting').val(options.sorting);
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
      const specialKeys = {
        ' ': 'space',
      };
      const pressedKeys = [];
      if (e.ctrlKey) pressedKeys.push('ctrl');
      if (e.shiftKey) pressedKeys.push('shift');
      if (e.altKey) pressedKeys.push('alt');
      if (e.metaKey) pressedKeys.push('meta');
      let keyStr = ['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)
        ? ''
        : specialKeys[e.key] || e.key;
      // Function keys remain capitalized
      if (keyStr.length < 2) {
        keyStr = keyStr.toLowerCase();
      }
      if (keyStr) pressedKeys.push(keyStr);
      let pressedKeysString = pressedKeys.join(' + ').trim();
      updateShortcutInput(pressedKeysString, true);
    }
  }

  function setupSearchPhraseListsHandler() {
    $('#PhraseLists__search').on('input', applyPhraseSearch);
  }

  function applyPhraseSearch() {
    const searchText = $.trim($('#PhraseLists__search').val() || '').toLowerCase();
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
    let highlighterStyles = `<style id="HighlighterStyles">span.PhraseList__phrase, span.Denylist__url { ${options.baseStyles} }\r\n`;
    for (let i = 0; i < options.highlighter.length; i++) {
      const { color: highlighterColor = 'black', textColor = 'white' } = options.highlighter[i];
      $(`#PhraseList--${i} .PhraseList__phraseCount`).css({
        backgroundColor: highlighterColor,
        color: textColor,
      });
      highlighterStyles += `span.PhraseList__phrase--${i} { background-color: ${highlighterColor}; color: ${textColor} }\r\n`;
    }
    highlighterStyles += '</style>';
    $('head').append(highlighterStyles);
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

  function sortPhrases(phrases, order) {
    let list = phrases.slice();
    if (order === 'A-Z') {
      list = alphabetical(list);
    } else if (order === 'Z-A') {
      list = reverseAlphabetical(list);
    }
    return list;
  }

  function addNewListDiv(list, index, isImportPreview = false) {
    const enabled = list.enabled !== false && list.toggled !== false;
    const $newListDiv = $(
      !isImportPreview ? '#PhraseList--invisible' : '#PhraseListPreview--invisible',
    )
      .clone()
      .attr('id', `PhraseList--${index}`)
      .attr('data-enabled', enabled)
      .data('index', index);
    $newListDiv.find('.PhraseList__color').css('background-color', list.color);
    $newListDiv.find('.PhraseList__title').text(list.title);
    $newListDiv.find('.PhraseList__phraseCount').text('0 phrases');
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
      const newURL = $.trim($input.val());
      if (!newURL) return;

      chrome.storage.local.get((options) => {
        const urls = options[optionName] || [];
        $input.val('');
        if (urls.includes(newURL)) {
          alert('URL was already in list!');
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
      if (!window.confirm(`Are you sure you want to remove: ${url}?`)) return;

      chrome.storage.local.get((options) => {
        const urls = options[optionName] || [];
        const urlIndex = urls.indexOf(url);
        if (urlIndex < 0) return;
        urls.splice(urlIndex, 1);
        chrome.storage.local.set({ [optionName]: urls }, () => {
          $url.remove();
        });
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
      chrome.storage.local.get((options) => {
        const listIndex = options.highlighter.length;
        const listTitle = $('#NewPhraseList__title').val().trim() || 'Untitled';
        const listColor = rgbaStringToHex($('#NewPhraseList__color').css('background-color'));
        const listTextColor = rgbaStringToHex($('#NewPhraseList__color').css('color'));
        const newList = {
          phrases: [],
          color: listColor,
          textColor: listTextColor,
          title: listTitle,
          enabled: true,
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
  }

  function setupPhraseListEnabledHandler($list) {
    $list.on('change', '.PhraseList__enabled', (event) => {
      const listIndex = $list.data('index');
      const enabled = $(event.currentTarget).is(':checked');
      chrome.storage.local.get((options) => {
        options.highlighter[listIndex].enabled = enabled;
        delete options.highlighter[listIndex].toggled;
        chrome.storage.local.set({ highlighter: options.highlighter }, () => {
          $list.attr('data-enabled', enabled);
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
        chrome.storage.local.get((options) => {
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
      var oldListName = $list.find('.PhraseList__title').text();
      var newListName = window.prompt('Please enter a new phrase list name', oldListName);
      if (newListName != null && newListName != '' && newListName != oldListName) {
        chrome.storage.local.get((options) => {
          // TODO: functionalize this?
          options.highlighter[$list.data('index')].title = newListName;
          chrome.storage.local.set({ highlighter: options.highlighter }, () => {
            $list.find('.PhraseList__title').text(newListName);
          });
        });
      }
    });
  }

  function setupPhraseListDeleteHandler($list) {
    $list.on('click', '.PhraseList__delete', () => {
      const oldListName = $list.find('.PhraseList__title').text();
      if (window.confirm(`Are you sure you want to delete ${oldListName}?`)) {
        chrome.storage.local.get((options) => {
          options.highlighter.splice($list.data('index'), 1);
          chrome.storage.local.set({ highlighter: options.highlighter }, () => {
            setupOptionsPage(options, false);
          });
        });
      }
    });
  }

  function setupPhraseListAddPhraseHandler($list) {
    let listIndex = $list.data('index');
    $list.on('click', '.PhraseList__newPhrase__add', (e) => {
      e.preventDefault();
      const $input = $list.find('.PhraseList__newPhrase__phrase');
      const newPhrase = $.trim($input.val());
      if (newPhrase.length > 0) {
        chrome.storage.local.get((options) => {
          if (options.highlighter[listIndex].phrases.includes(newPhrase)) {
            $input.val('');
            alert('Phrase was already in list!');
          } else {
            options.highlighter[listIndex].phrases.push(newPhrase);
            $input.val('');
            chrome.storage.local.set({ highlighter: options.highlighter }, () => {
              addPhraseElement($list, newPhrase, listIndex);
            });
          }
        });
      }
    });
  }

  function setupPhraseListDeletePhraseHandler($list) {
    let listIndex = $list.data('index');
    let $phrases = $list.find('.PhraseList__phrases');
    $phrases.on('click', '.PhraseList__phrase__delete', (e) => {
      const $phrase = $(e.target).parent();
      const phrase = $phrase.data('phrase');
      let confirmationMessage = 'Are you sure you want to delete: ' + phrase + '?';
      if (window.confirm(confirmationMessage)) {
        chrome.storage.local.get((options) => {
          let phraseIndex = options.highlighter[listIndex].phrases.indexOf(phrase);
          if (phraseIndex < 0) return;
          options.highlighter[listIndex].phrases.splice(phraseIndex, 1);
          chrome.storage.local.set({ highlighter: options.highlighter }, () => {
            $phrase.remove();
            decrementPhraseCount($list);
            applyPhraseSearch();
          });
        });
      }
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
    chrome.storage.local.get((options) => {
      const listIndex = $('#ExportModal').data('index');
      const phrases = options.highlighter[listIndex].phrases;
      const delimiter = tabName === 'Line-Delimited' ? '\r\n' : ' ';
      const multiWordPhraseCount = phrases.filter((phrase) => /\s/.test(phrase)).length;

      $('#ExportModal__body').val(phrases.join(delimiter));
      $('#ExportModal__phraseCount').text(phrases.length);
      $('#ExportModal__spaceWarning')
        .toggleClass('is-hidden', tabName !== 'Space-Delimited')
        .find('.message-body')
        .html(
          multiWordPhraseCount > 0
            ? `<b>${pluralize(
                multiWordPhraseCount,
                'multi-word phrase',
              )} will not be preserved.</b> A space-delimited import treats every word as a separate phrase. Use Line-Delimited for a lossless export.`
            : '<b>Space-delimited exports cannot preserve multi-word phrases.</b> Use Line-Delimited if you add any phrases containing spaces.',
        );
    });
  }

  function getDelimitedPhrases(body, format) {
    if (format === 'Space-Delimited') {
      return body.match(/\S+/g) || [];
    }
    return body
      .split(/\r?\n/)
      .map((phrase) => phrase.trim())
      .filter(Boolean);
  }

  /**
   * Given an object represent a preview of the new highlighter list settings after the import,
   * set up the bulk preview modal.
   */
  function setupBulkImportPreviewModal(newHighlighter) {
    $('#BulkImportPreviewModal__preview').html('');
    $('#BulkImportPreviewModal__phraseListCount').text(newHighlighter.length);
    $('#BulkImportPreviewModal__phraseCount').text(
      newHighlighter.reduce((prev, curr) => prev + curr.phrases.length, 0),
    );
    addExistingLists(
      {
        highlighter: newHighlighter,
        sorting: $('#Settings__sorting').val() || 'None',
      },
      true,
    );
    $('#BulkImportPreviewModal').addClass('is-active');
    $('#BulkImportPreviewModal__import').off('click');
    $('#BulkImportPreviewModal__import').on('click', () => {
      chrome.storage.local.set({ highlighter: newHighlighter }, () => {
        chrome.storage.local.get((options) => {
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
      const importType = e.target.value;
      const importName = $.trim($(`#BulkImportModal__typesSelect--${importType}`).text());
      $(`#BulkImportModal__typesInfo--${importType}`).show();
      $('#BulkImportPreviewModal__optionName').text(importName);
    });

    $('#BulkImportModal__fileInput').on('change', (event) => {
      const file = event.target.files[0];
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

      const reader = new FileReader();
      reader.onload = () => {
        const $body = $('#BulkImportModal__body');
        $body.stop(true, true).fadeTo(100, 0, () => {
          $body.val(reader.result).fadeTo(150, 1);
        });
        $('#BulkImportModal__fileName').text(file.name);
        setBulkImportFileStatus(`Loaded ${file.name}. Its contents replaced the text below.`);
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
        if ($.trim(importBody).length === 0) {
          throw new Error('Nothing to import.');
        }
        const newImportLists = parseBulkImport(importBody);
        if (importType === 'Replace') {
          setupBulkImportPreviewModal(newImportLists);
        } else if (importType === 'ImportAsNew' || importType === 'ImportAndMerge') {
          chrome.storage.local.get((options) => {
            const existingLists = clonePhraseLists(options.highlighter);
            if (importType === 'ImportAsNew') {
              setupBulkImportPreviewModal(existingLists.concat(newImportLists));
              return;
            }

            const newListsToAppend = [];
            newImportLists.forEach((newList) => {
              const existingList = existingLists.find((list) => list.title === newList.title);
              if (existingList) {
                existingList.phrases = arrayMerge(existingList.phrases, newList.phrases);
                existingList.color = newList.color;
                existingList.textColor = newList.textColor;
                existingList.enabled = newList.enabled;
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
        alert(
          `Invalid import data. Please use a .txt or .json file created by Bulk Export.\r\n\r\nError: ${error.message}`,
        );
      }
    });
  }

  function parseBulkImport(importBody) {
    const parsedLists = JSON.parse(importBody);
    if (!Array.isArray(parsedLists) || parsedLists.length === 0) {
      throw new Error('Imported contents must be a non-empty array of phrase lists.');
    }

    return parsedLists.map((phraseList, index) => {
      if (!phraseList || typeof phraseList !== 'object' || Array.isArray(phraseList)) {
        throw new Error(`List ${index + 1} must be an object.`);
      }
      if (typeof phraseList.title !== 'string' || !phraseList.title.trim()) {
        throw new Error(`List ${index + 1} must have a non-empty "title" string.`);
      }
      if (
        typeof phraseList.color !== 'string' ||
        !/^#[a-f\d]{6}(?:[a-f\d]{2})?$/i.test(phraseList.color)
      ) {
        throw new Error(`List ${index + 1} must have a hex color such as "#ffffff".`);
      }
      if (!Array.isArray(phraseList.phrases)) {
        throw new Error(`List ${index + 1} must have a "phrases" array.`);
      }
      if (phraseList.phrases.some((phrase) => typeof phrase !== 'string')) {
        throw new Error(`Every phrase in list ${index + 1} must be a string.`);
      }
      if ('enabled' in phraseList && typeof phraseList.enabled !== 'boolean') {
        throw new Error(`List ${index + 1} must have a boolean "enabled" value.`);
      }
      if ('toggled' in phraseList && typeof phraseList.toggled !== 'boolean') {
        throw new Error(`List ${index + 1} must have a boolean legacy "toggled" value.`);
      }
      const normalizedPhrases = [
        ...new Set(phraseList.phrases.map((phrase) => phrase.trim()).filter(Boolean)),
      ];

      return {
        color: phraseList.color,
        phrases: normalizedPhrases,
        textColor: getTextColor(phraseList.color),
        title: phraseList.title.trim(),
        enabled:
          typeof phraseList.enabled === 'boolean'
            ? phraseList.enabled
            : typeof phraseList.toggled === 'boolean'
              ? phraseList.toggled
              : true,
      };
    });
  }

  function clonePhraseLists(highlighter) {
    return (highlighter || []).map((list) => ({
      ...list,
      phrases: list.phrases.slice(),
    }));
  }

  function resetBulkImportFile() {
    $('#BulkImportModal__fileInput').val('');
    $('#BulkImportModal__fileName').text('No file selected');
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
      chrome.storage.local.get((options) => {
        const highlighterExport = [];
        let phraseCount = 0;
        Object.values(options.highlighter).forEach((phraseList) => {
          phraseCount += phraseList.phrases.length;
          highlighterExport.push({
            title: phraseList.title,
            color: phraseList.color,
            phrases: phraseList.phrases,
            enabled: phraseList.enabled !== false && phraseList.toggled !== false,
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
        chrome.storage.local.get((options) => {
          const listIndex = $('#ImportModal').data('index');
          const currentPhraseList = options.highlighter[listIndex].phrases;
          let phrasesSkipped = 0;
          let phrasesAdded = 0;
          for (const phrase of phrasesToAdd) {
            if (!currentPhraseList.includes(phrase)) {
              currentPhraseList.push(phrase);
              addPhraseElement($(`#PhraseList--${listIndex}`), phrase, listIndex, false);
              phrasesAdded++;
            } else {
              phrasesSkipped++;
            }
          }
          chrome.storage.local.set({ highlighter: options.highlighter }, () => {
            applyPhraseSearch();
            let alertMessage = `${pluralize(phrasesAdded, 'phrase')} added.`;
            if (phrasesSkipped > 0) {
              alertMessage += `\n${pluralize(
                phrasesSkipped,
                'phrase',
              )} skipped due to already being in the list.`;
            }
            alert(alertMessage);
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

  chrome.storage.local.get((options) => {
    setupOptionsPage(options);
  });

  $('#Settings__save').on('click', () => {
    chrome.storage.local.get((options) => {
      const newEnableAutoHighlight = $('#Settings__enableAutoHighlight').is(':checked');
      const newEnableAutoHighlightUpdates = $('#Settings__enableAutoHighlightUpdates').is(
        ':checked',
      );
      const newEnableTitleMouseover = $('#Settings__enableTitleMouseover').is(':checked');
      const newEnablePartialMatch = $('#Settings__enablePartialMatch').is(':checked');
      const newEnableCaseInsensitive = $('#Settings__enableCaseInsensitive').is(':checked');
      const newKeyboardShortcut = $('#Settings__keyboardShortcut').val();
      const newEnableURLDenylist = $('#Settings__enableURLDenylist').is(':checked');
      const newEnableURLAllowlist = $('#Settings__enableURLAllowlist').is(':checked');
      const newSorting = $('#Settings__sorting').val();

      const newOptions = {
        ...options,
        enableAutoHighlight: newEnableAutoHighlight,
        enableAutoHighlightUpdates: newEnableAutoHighlightUpdates,
        enableTitleMouseover: newEnableTitleMouseover,
        enablePartialMatch: newEnablePartialMatch,
        enableCaseInsensitive: newEnableCaseInsensitive,
        enableURLDenylist: newEnableURLDenylist,
        enableURLAllowlist: newEnableURLAllowlist,
        keyboardShortcut: newKeyboardShortcut,
        sorting: newSorting,
      };

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
        setupOptionsPage(newOptions, false);
      });
    });
  });

  function pluralize(count, noun, suffix = 's') {
    return `${count} ${noun}${count !== 1 ? suffix : ''}`;
  }

  /**
   * Alphabetically sorts a list of strings
   */
  function alphabetical(list) {
    list.sort((a, b) => {
      const A = a.toLowerCase();
      const B = b.toLowerCase();
      if (A < B) {
        return -1;
      }
      if (A > B) {
        return 1;
      }
      return 0;
    });
    return list;
  }

  function reverseAlphabetical(list) {
    let sortedList = alphabetical(list);
    sortedList.reverse();
    return sortedList;
  }

  /**
   * Returns either black or white -- whichever would look better as a text color on the hex background color provided.
   * https://stackoverflow.com/a/1855903
   */
  function getTextColor(hex) {
    const rgb = hexToRgbArray(hex);
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
  /**
   * Given hex string, convert to rgb array
   * https://stackoverflow.com/a/21646821
   */
  function hexToRgbArray(hexString) {
    const hex = hexString.toLowerCase();
    var h = '0123456789abcdef';
    var r = h.indexOf(hex[1]) * 16 + h.indexOf(hex[2]);
    var g = h.indexOf(hex[3]) * 16 + h.indexOf(hex[4]);
    var b = h.indexOf(hex[5]) * 16 + h.indexOf(hex[6]);
    return [r, g, b];
  }

  /** rgbaToHex, rgbaStringToHex, hexClean functions -- keep in sync with background.js **/
  /**
   * Given rgba array, convert to hex string
   * e.g. [187, 0, 0, 1], -> "#BB0000"
   * https://stackoverflow.com/a/3627747
   */
  function rgbaToHex(rgba) {
    const hex = `#${rgba
      .map((n, i) =>
        (i === 3 ? Math.round(parseFloat(n) * 255) : parseFloat(n))
          .toString(16)
          .padStart(2, '0')
          .replace('NaN', ''),
      )
      .join('')}`;
    return hexClean(hex);
  }

  /**
   * Same as above, but from string form, e.g. "rgba(0,0,0,0)".
   *
   * This is used mainly used because jQuery's 'css' function by default will pull the rgba string instead of hex.
   * To maintain consistency for imports & exports merging, we'll just always use the hex string.
   * https://stackoverflow.com/a/3627747
   */
  function rgbaStringToHex(rgbaString) {
    const rgba = rgbaString
      .match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+\.{0,1}\d*))?\)$/)
      .slice(1);
    return rgbaToHex(rgba);
  }

  /**
   * Given a hex string color, e.g. #ffffff00, remove the opacity if-and-only-if it is "ff" (1.0).
   *
   * This makes the export a tad cleaner and easier to work with.
   */
  function hexClean(hex) {
    return hex.length > 7 && hex.slice(-2) === 'ff' ? hex.slice(0, 7) : hex;
  }
});

/**
 * Merge two arrays without duplicates:
 * https://stackoverflow.com/a/23080662
 * */
function arrayMerge(array1, array2) {
  return array1.concat(array2.filter((item) => array1.indexOf(item) < 0));
}
