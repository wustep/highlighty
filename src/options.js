/* Highlighty.js | by Stephen Wu */

$(function () {
  /**
   * Set up or reset the options page handlers and lists components.
   * If fresh is false, then don't run the one-time handlers setup meant for a fresh load.
   */
  function setupOptionsPage(options, fresh = true) {
    removeExistingLists();
    removeExistingListStyles();
    updateKeyboardShortcutInput(options.keyboardShortcut);

    addExistingLists(options);
    addExistingListStyles(options);
    // These handlers should only be ran once.
    if (fresh) {
      addExistingURLLists(options);
      setPrimarySettings(options);
      setupKeyboardShortcutHandler();
      setupAutoHighlightHandler();
      setupURLListHandlers();
      setupAddPhraseListHandler();
      setupImportExportModals();
    }
  }

  function removeExistingLists() {
    // This will also remove all associated handlers in the phrase list
    $('.PhraseList').not('#PhraseList--invisible').remove();
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

  function updateKeyboardShortcutInput(shortcutString = '') {
    const keyboardShortcutInput = $('#Settings__keyboardShortcut');
    keyboardShortcutInput.val(shortcutString);
    keyboardShortcutInput.width((shortcutString.length + 6) * 5);
  }

  function setupKeyboardShortcutHandler() {
    const keyboardShortcutInput = $('#Settings__keyboardShortcut');

    function stopRecording() {
      document.getElementById('Settings__keyboardShortcut').setAttribute('data-recording', 'false');
      document.removeEventListener('keydown', handleKeyDown);
    }

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
        updateKeyboardShortcutInput('');
        return;
      }
      const specialKeys = {
        ' ': 'space',
      };
      const pressedKeys = [];
      if (e.ctrlKey) pressedKeys.push('ctrl');
      if (e.shiftKey) pressedKeys.push('shift');
      if (e.altKey) pressedKeys.push('alt');
      if (e.metaKey) pressedKeys.push('meta');
      let keyStr = ['Control', 'Shift', 'Alt', 'Meta,'].includes(e.key)
        ? ''
        : specialKeys[e.key] || e.key;
      // Function keys remain capitalized
      if (keyStr.length < 2) {
        keyStr = keyStr.toLowerCase();
      }
      if (keyStr) pressedKeys.push(keyStr);
      let pressedKeysString = pressedKeys.join(' + ').trim();
      updateKeyboardShortcutInput(pressedKeysString);
    }
  }

  function addExistingURLLists(options) {
    if (options.denylist.length) {
      for (let url of options.denylist) {
        addDenylistURLElement(url);
      }
    }
    if (options.allowlist.length) {
      for (let url of options.allowlist) {
        addAllowlistURLElement(url);
      }
    }
  }

  function addDenylistURLElement(url) {
    const $url = $('<span>', { class: 'tag is-medium Denylist__url' }).text(url);
    $url.append($('<button>', { class: 'delete is-small Denylist__url__delete' }));
    $('#Denylist__urls').append($url);
  }

  function addAllowlistURLElement(url) {
    const $url = $('<span>', { class: 'tag is-medium Allowlist__url' }).text(url);
    $url.append($('<button>', { class: 'delete is-small Allowlist__url__delete' }));
    $('#Allowlist__urls').append($url);
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
          addPhraseElement($newListDiv, phrase, i);
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
      $newListDiv.insertBefore('#NewPhraseList');
    }
    return $newListDiv;
  }

  function addPhraseElement($listDiv, phrase, listIndex) {
    const $phrase = $('<span>', {
      class: `tag is-medium PhraseList__phrase PhraseList__phrase--${listIndex}`,
      'data-list': listIndex,
    }).text(phrase);
    $phrase.append($('<button>', { class: 'delete is-small PhraseList__phrase__delete' }));
    $listDiv.find('.PhraseList__phrases').append($phrase);
    incrementPhraseCount($listDiv);
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
    phraseCount--;
    $phraseCount.data('count', phraseCount);
    $phraseCount.text(`${phraseCount} phrase${phraseCount !== 1 ? 's' : ''}`);
  }

  function addPreviewPhraseElement($listDiv, phrase, color) {
    const textColor = getTextColor(color);
    const $phrase = $('<span>', { class: 'tag is-medium PhraseList__phrase' })
      .text(phrase)
      .css({ backgroundColor: color, color: textColor });
    $listDiv.find('.PhraseList__phrases').append($phrase);
  }

  function setupURLListHandlers() {
    $('#Denylist__add').on('click', (e) => {
      e.preventDefault();
      const newURL = $('#Denylist__urlInput').val().trim();
      if (newURL) {
        chrome.storage.local.get((options) => {
          $('#Denylist__urlInput').val('');
          if (options.denylist.includes(newURL)) {
            alert('URL was already in list!');
          } else {
            options.denylist.push(newURL);
            chrome.storage.local.set({ denylist: options.denylist }, () => {
              addDenylistURLElement(newURL);
            });
          }
        });
      }
    });
    $('#Allowlist__add').on('click', (e) => {
      e.preventDefault();
      const newURL = $('#Allowlist__urlInput').val().trim();
      if (newURL) {
        chrome.storage.local.get((options) => {
          $('#Allowlist__urlInput').val('');
          if (options.allowlist.includes(newURL)) {
            alert('URL was already in list!');
          } else {
            options.allowlist.push(newURL);
            chrome.storage.local.set({ allowlist: options.allowlist }, () => {
              addAllowlistURLElement(newURL);
            });
          }
        });
      }
    });
    $('#Settings').on('click', '.Denylist__url__delete', (e) => {
      let $url = $(e.target).parent();
      if (window.confirm('Are you sure you want to remove: ' + $url.text() + '?')) {
        chrome.storage.local.get((options) => {
          let urlIndex = options.denylist.indexOf($url.text());
          options.denylist.splice(urlIndex, 1);
          chrome.storage.local.set({ denylist: options.denylist }, () => {
            $url.remove();
          });
        });
      }
    });
    $('#Settings').on('click', '.Allowlist__url__delete', (e) => {
      let $url = $(e.target).parent();
      if (window.confirm('Are you sure you want to remove: ' + $url.text() + '?')) {
        chrome.storage.local.get((options) => {
          let urlIndex = options.allowlist.indexOf($url.text());
          options.allowlist.splice(urlIndex, 1);
          chrome.storage.local.set({ allowlist: options.allowlist }, () => {
            $url.remove();
          });
        });
      }
    });
    $('#Settings').on('click', '#Settings__enableURLDenylist', (e) => {
      $('#Settings__enableURLAllowlist').prop('checked', false);
    });
    $('#Settings').on('click', '#Settings__enableURLAllowlist', (e) => {
      $('#Settings__enableURLDenylist').prop('checked', false);
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
      const oldListName = $list.find('.PhraseList__title').text();
      const enteredListName = window.prompt('Please enter a new phrase list name', oldListName);
      const newListName = enteredListName?.trim();
      if (newListName && newListName !== oldListName) {
        chrome.storage.local.get((options) => {
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
    const listIndex = $list.data('index');
    $list.on('click', '.PhraseList__newPhrase__add', (e) => {
      e.preventDefault();
      const newPhrase = $list.find('.PhraseList__newPhrase__phrase').val().trim();
      if (!newPhrase) {
        return;
      }

      chrome.storage.local.get((options) => {
        $list.find('.PhraseList__newPhrase__phrase').val('');
        if (options.highlighter[listIndex].phrases.includes(newPhrase)) {
          alert('Phrase was already in list!');
        } else {
          options.highlighter[listIndex].phrases.push(newPhrase);
          chrome.storage.local.set({ highlighter: options.highlighter }, () => {
            addPhraseElement($list, newPhrase, listIndex);
          });
        }
      });
    });
  }

  function setupPhraseListDeletePhraseHandler($list) {
    let listIndex = $list.data('index');
    let $phrases = $list.find('.PhraseList__phrases');
    $phrases.on('click', '.PhraseList__phrase__delete', (e) => {
      let $phrase = $(e.target).parent();
      let confirmationMessage = 'Are you sure you want to delete: ' + $phrase.text().trim() + '?';
      if (window.confirm(confirmationMessage)) {
        chrome.storage.local.get((options) => {
          let phraseIndex = options.highlighter[listIndex].phrases.indexOf($phrase.text());
          options.highlighter[listIndex].phrases.splice(phraseIndex, 1);
          chrome.storage.local.set({ highlighter: options.highlighter }, () => {
            $phrases.find($phrase).remove();
            decrementPhraseCount($list);
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
  }

  function setExportModalTab(tabName) {
    $('#ExportModal__tabs').find('li').removeClass('is-active');
    $('#ExportModal__tabs').find(`#ExportModal__tab--${tabName}`).addClass('is-active');
    chrome.storage.local.get((options) => {
      let listIndex = $('#ExportModal').data('index');
      let exportFormat = $('#ExportModal__tabs li.is-active').attr('id').split('--')[1];
      let phraseList = '';
      if (exportFormat === 'Line-Delimited') {
        for (let phrase of options.highlighter[listIndex].phrases) {
          phraseList += phrase + '\r\n';
        }
      } else if (exportFormat === 'Space-Delimited') {
        for (let phrase of options.highlighter[listIndex].phrases) {
          phraseList += phrase + ' ';
        }
      }
      $('#ExportModal__body').val(phraseList.trim());
      $('#ExportModal__body').trigger('change');
    });
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
    addExistingLists(newHighlighter, true);
    $('#BulkImportPreviewModal').addClass('is-active');
    $('#BulkImportPreviewModal__import').off('click');
    $('#BulkImportPreviewModal__import').on('click', (e) => {
      chrome.storage.local.set({ highlighter: newHighlighter }, () => {
        // Rather than making some changes, re-doing the whole settings page is just easier
        chrome.storage.local.get((options) => {
          setupOptionsPage(options, false);
        });
      });
      $('#BulkImportModal').removeClass('is-active');
      $('#BulkImportPreviewModal').removeClass('is-active');
      $('#BulkImportModal__body').val('');
    });
  }

  function setupBulkImportModal() {
    $('#BulkImport').on('click', (e) => {
      $('#BulkImportModal').addClass('is-active');
    });

    $('#BulkImportModal__typesSelect').change((e) => {
      $('#BulkImportModal__typesInfo > div').hide();
      const importType = e.target.value;
      const importName = $.trim($(`#BulkImportModal__typesSelect--${importType}`).text());
      $(`#BulkImportModal__typesInfo--${importType}`).show();
      $('#BulkImportPreviewModal__optionName').text(importName);
    });

    $('#BulkImportModal__previewImport').on('click', (e) => {
      const importType = $('#BulkImportModal__typesSelect').val();
      const importBody = $('#BulkImportModal__body').val();
      try {
        // Validate the contents of the import text.
        const importBodyParsed = JSON.parse(importBody);
        const newImportLists = [];
        if (!Array.isArray(importBodyParsed) || importBodyParsed.length === 0) {
          throw new Error(
            `Imported contents must be a non-empty array representing phrase lists. Check the Bulk Export tool for an example.`,
          );
        }
        importBodyParsed.forEach((phraseList, i) => {
          const phraseListKeys = Object.keys(phraseList);
          if (
            !phraseListKeys.includes('title') ||
            typeof phraseList.title !== 'string' ||
            !phraseList.title.trim()
          ) {
            throw new Error(`List ${i} must have proper "title" string property`);
          }
          if (
            !phraseListKeys.includes('color') ||
            typeof phraseList.color !== 'string' ||
            !phraseList.color.match(/^#[a-f\d]{6}$/i)
          ) {
            throw new Error(
              `List ${i} must have proper "color" property with hexadecimal color string, e.g. "#ffffff"`,
            );
          }
          if (!phraseListKeys.includes('phrases') || !Array.isArray(phraseList.phrases)) {
            throw new Error(
              `List ${i} must have proper "phrases" property with array of phrases, e.g. ["Hello", "world"]`,
            );
          }
          for (const phrase of phraseList.phrases) {
            if (typeof phrase !== 'string') {
              throw new Error(`List ${i}'s phrases must be all strings, e.g. ["Hello", "world"].`);
            }
          }
          if ('enabled' in phraseList && typeof phraseList.enabled !== 'boolean') {
            throw new Error(`List ${i} must have a boolean "enabled" property when provided.`);
          }
          const normalizedPhrases = [
            ...new Set(phraseList.phrases.map((phrase) => phrase.trim()).filter(Boolean)),
          ];
          newImportLists.push({
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
          });
        });

        // Set up the new highlighter object as preview, then setup & open the modal
        // Note that because chrome.storage.local.get is async, we have to put the modal set up inside that call.
        let newHighlighter = [];
        if (importType === 'ImportAsNew') {
          chrome.storage.local.get((options) => {
            newHighlighter = options.highlighter.concat(newImportLists);
            setupBulkImportPreviewModal(newHighlighter);
          });
        } else if (importType === 'ImportAndMerge') {
          chrome.storage.local.get((options) => {
            const existingLists = options.highlighter.map((list) => ({
              ...list,
              phrases: list.phrases.slice(),
            }));
            const newListsToAppend = [];
            newImportLists.forEach((newList) => {
              const existingListToMerge = existingLists.find(
                (list) => list.title === newList.title,
              );
              if (existingListToMerge) {
                existingListToMerge.phrases = arrayMerge(
                  existingListToMerge.phrases,
                  newList.phrases,
                );
                existingListToMerge.color = newList.color;
                existingListToMerge.textColor = newList.textColor;
                existingListToMerge.enabled = newList.enabled;
              } else {
                newListsToAppend.push(newList);
              }
            });
            newHighlighter = existingLists.concat(newListsToAppend);
            setupBulkImportPreviewModal(newHighlighter);
          });
        } else if (importType === 'Replace') {
          newHighlighter = [].concat(newImportLists);
          setupBulkImportPreviewModal(newHighlighter);
        } else {
          alert(
            `Invalid import type: ${importType}. Please report this bug via the Contact form on Info!`,
          );
        }
      } catch (e) {
        if ($.trim(importBody).length === 0) {
          alert('Nothing to import!');
        } else {
          alert(
            `Invalid import text! Please ensure your import was formatted properly from the Bulk Export tool.\r\n\r\Debug Error: ${e.message}\r\n\r\nIf you think this is a bug, please report via the contact form on the Info page!`,
          );
        }
      }
    });
  }

  function setupBulkExportModal() {
    $('#BulkExport').on('click', (e) => {
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
      let tabName = e.currentTarget.id.split('--')[1];
      setImportModalTab(tabName);
      $('#ImportModal__body').trigger('change'); // Force change to trigger phrase count change
    });
    $('#ExportModal__tabs > li').on('click', (e) => {
      let tabName = e.currentTarget.id.split('--')[1];
      setExportModalTab(tabName);
    });
  }

  function setupImportExportCloseHandlers() {
    $('#ImportModal__cancel, #ImportModal__close').on('click', (e) => {
      $('#ImportModal').removeClass('is-active');
    });
    $('#ExportModal__cancel, #ExportModal__close').on('click', (e) => {
      $('#ExportModal').removeClass('is-active');
    });
    $('#BulkExportModal__cancel, #BulkExportModal__close').on('click', (e) => {
      $('#BulkExportModal').removeClass('is-active');
    });
    $('#BulkImportModal__cancel, #BulkImportModal__close').on('click', (e) => {
      $('#BulkImportModal').removeClass('is-active');
    });
    $('#BulkImportPreviewModal__cancel, #BulkImportPreviewModal__close').on('click', (e) => {
      $('#BulkImportPreviewModal').removeClass('is-active');
    });
  }

  function setupImportExportPhraseCountHandler() {
    $('#ImportModal__body').on('change keyup paste', () => {
      let importFormat = $('#ImportModal__tabs li.is-active').attr('id').split('--')[1];
      let phraseCount = 0;
      if (importFormat === 'Line-Delimited') {
        phraseCount = (
          $('#ImportModal__body')
            .val()
            .split('\n')
            .filter((p) => p.trim() != '') || []
        ).length;
      } else if (importFormat === 'Space-Delimited') {
        phraseCount = ($('#ImportModal__body').val().match(/\S+/g) || []).length;
      }
      $('#ImportModal__phraseCount').text(phraseCount);
    });
    $('#ExportModal__body').on('change', () => {
      const exportFormat = $('#ExportModal__tabs li.is-active').attr('id').split('--')[1];
      let phraseCount = 0;
      if (exportFormat === 'Line-Delimited') {
        phraseCount = (
          $('#ExportModal__body')
            .val()
            .split('\n')
            .filter((p) => p.trim() != '') || []
        ).length;
      } else if (exportFormat === 'Space-Delimited') {
        phraseCount = ($('#ExportModal__body').val().match(/\S+/g) || []).length;
      }
      $('#ExportModal__phraseCount').text(phraseCount);
    });
  }

  function setupImportSubmitButton() {
    $('#ImportModal__submit').on('click', () => {
      const phraseCount = Number($('#ImportModal__phraseCount').text());
      if (phraseCount > 0) {
        chrome.storage.local.get((options) => {
          const listIndex = $('#ImportModal').data('index');
          const currentPhraseList = options.highlighter[listIndex].phrases;
          const importFormat = $('#ImportModal__tabs li.is-active').attr('id').split('--')[1];
          let phrasesToAdd = [];
          if (importFormat === 'Space-Delimited') {
            phrasesToAdd = $('#ImportModal__body').val().match(/\S+/g) || [];
          } else if (importFormat === 'Line-Delimited') {
            phrasesToAdd =
              $('#ImportModal__body')
                .val()
                .split('\n')
                .map((phrase) => phrase.trim())
                .filter(Boolean) || [];
          }
          let phrasesSkipped = 0;
          let phrasesAdded = 0;
          for (const phrase of new Set(phrasesToAdd)) {
            if (!currentPhraseList.includes(phrase)) {
              options.highlighter[listIndex].phrases.push(phrase);
              addPhraseElement($(`#PhraseList--${listIndex}`), phrase, listIndex);
              phrasesAdded++;
            } else {
              phrasesSkipped++;
            }
          }
          let alertMessage = `${pluralize(phrasesAdded, 'phrase')} added.`;
          if (phrasesSkipped > 0) {
            alertMessage += `\n${pluralize(
              phrasesSkipped,
              'phrase',
            )} skipped due to already being in the list.`;
          }
          alert(alertMessage);
          chrome.storage.local.set({ highlighter: options.highlighter });
        });
      }
      $('#ImportModal').removeClass('is-active');
    });
  }

  function setupExportCopyButton() {
    $('#ExportModal__copy').on('click', (e) => {
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
        alert('Settings saved!');
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
