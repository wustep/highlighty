/* Highlighty.js | by Stephen Wu */

$(function () {
  /**
   * Set up or reset the options page handlers and lists components.
   * If fresh is false, then don't run the one-time handlers setup meant for a fresh load.
   */
  function setupOptionsPage(options, fresh = true) {
    removeExistingLists();
    removeExistingListStyles();

    addExistingLists(options.highlighter);
    addExistingListStyles(options);

    // These handlers should only be ran once.
    if (fresh) {
      setupSearchPhraseListsHandler();
      addExistingURLLists(options);
      setPrimarySettings(options);
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
    $('#Settings__enableAutoHighlight').attr('checked', options.enableAutoHighlight);
    $('#Settings__enableAutoHighlightUpdates').attr('checked', options.enableAutoHighlightUpdates);
    $('#Settings__enableTitleMouseover').attr('checked', options.enableTitleMouseover);
    $('#Settings__enablePartialMatch').attr('checked', options.enablePartialMatch);
    $('#Settings__enableCaseInsensitive').attr('checked', options.enableCaseInsensitive);
    $('#Settings__keyboardShortcut').val(options.keyboardShortcut);
    $('#Settings__enableURLDenylist').attr('checked', options.enableURLDenylist);
    $('#Settings__enableURLAllowlist').attr('checked', options.enableURLAllowlist);
    showHideAutoHighlightSettings();
  }

  function showHideAutoHighlightSettings() {
    if ($('#Settings__enableAutoHighlight').is(':checked')) {
      $('#Settings__AutoHighlight').show();
    } else {
      $('#Settings__AutoHighlight').hide();
    }
  }

  function setupSearchPhraseListsHandler() {
    $('#PhraseLists__search').on('keyup', function () {
      $('.PhraseList__phrase').each(function () {
        let $phrase = $(this);
        let phraseText = $phrase.text().toLowerCase();
        let searchText = $('#PhraseLists__search').val().toLowerCase();
        if (phraseText.indexOf(searchText) === -1) {
          $phrase.hide();
        } else {
          $phrase.show();
        }
      });
    });
  }

  function setupAutoHighlightHandler() {
    $('#Settings__enableAutoHighlight').on('click', function () {
      showHideAutoHighlightSettings();
    });
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
    $('#Denylist__urls').append(
      `<span class="tag is-medium Denylist__url">` +
        url +
        `<button class="delete is-small Denylist__url__delete"></button>` +
        `</span>`,
    );
  }

  function addAllowlistURLElement(url) {
    $('#Allowlist__urls').append(
      `<span class="tag is-medium Allowlist__url">` +
        url +
        `<button class="delete is-small Allowlist__url__delete"></button>` +
        `</span>`,
    );
  }

  function addExistingListStyles(options) {
    let highlighterStyles = `<style id="HighlighterStyles">span.PhraseList__phrase, span.Denylist__url { ${options.baseStyles} }\r\n`;
    for (let i = 0; i < options.highlighter.length; i++) {
      const { color: highlighterColor = 'black', textColor = 'white' } = options.highlighter[i];
      // Skip empty lists!
      if (Object.keys(options.highlighter[i]).length) {
        $(`#PhraseList--${i} .PhraseList__phraseCount`).css({
          backgroundColor: highlighterColor,
          color: textColor
        });
        highlighterStyles += `span.PhraseList__phrase--${i} { background-color: ${highlighterColor}; color: ${textColor} }\r\n`;
      }
    }
    highlighterStyles += '</style>';
    $('head').append(highlighterStyles);
  }

  function addExistingLists(highlighter, isImportPreview = false) {
    for (let i = 0; i < highlighter.length; i++) {
      if (Object.keys(highlighter[i]).length) {
        let $newListDiv = addNewListDiv(
          highlighter[i].title,
          highlighter[i].color,
          i,
          isImportPreview,
        );
        for (let j = 0; j < highlighter[i].phrases.length; j++) {
          if (isImportPreview) {
            addPreviewPhraseElement($newListDiv, highlighter[i].phrases[j], highlighter[i].color);
          } else {
            addPhraseElement($newListDiv, highlighter[i].phrases[j], i);
          }
        }
      }
    }
  }

  function addNewListDiv(title, color, index, isImportPreview = false) {
    $newListDiv = $(!isImportPreview ? '#PhraseList--invisible' : '#PhraseListPreview--invisible')
      .clone()
      .attr('id', `PhraseList--${index}`)
      .data('index', index);
    $newListDiv.find('.PhraseList__color').css('background-color', color);
    $newListDiv.find('.PhraseList__title').text(title);
    $newListDiv.find('.PhraseList__phraseCount').text('0 phrases');
    if (isImportPreview) {
      $('#BulkImportPreviewModal__preview').append($newListDiv);
    } else {
      setupPhraseListHandlers($newListDiv);
      $newListDiv.insertBefore('#NewPhraseList');
    }
    return $newListDiv;
  }

  function addPhraseElement($listDiv, phrase, listIndex) {
    $listDiv.find('.PhraseList__phrases').append(
      `<span class="tag is-medium PhraseList__phrase PhraseList__phrase--${listIndex}" data-list="${listIndex}">${phrase}
          <button class="delete is-small PhraseList__phrase__delete"></button>
        </span>`,
    );
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
    $listDiv
      .find('.PhraseList__phrases')
      .append(
        `<span class="tag is-medium PhraseList__phrase" style="background-color:${color};color:${textColor}">${phrase}</span>`,
      );
  }

  function setupURLListHandlers() {
    $('#Denylist__add').on('click', (e) => {
      e.preventDefault();
      chrome.storage.local.get((options) => {
        let newURL = $('#Denylist__urlInput').val();
        if (newURL.length > 0) {
          chrome.storage.local.get((options) => {
            if (options.denylist.includes(newURL)) {
              $('#Denylist__urlInput').val('');
              alert('URL was already in list!');
            } else {
              $('#Denylist__urlInput').val('');
              options.denylist.push(newURL.trim());
              chrome.storage.local.set({ denylist: options.denylist }, () => {
                addDenylistURLElement(newURL);
              });
            }
          });
        }
      });
    });
    $('#Allowlist__add').on('click', (e) => {
      e.preventDefault();
      chrome.storage.local.get((options) => {
        let newURL = $('#Allowlist__urlInput').val();
        if (newURL.length > 0) {
          chrome.storage.local.get((options) => {
            if (options.allowlist.includes(newURL)) {
              $('#Allowlist__urlInput').val('');
              alert('URL was already in list!');
            } else {
              $('#Allowlist__urlInput').val('');
              options.allowlist.push(newURL.trim());
              chrome.storage.local.set({ allowlist: options.allowlist }, () => {
                addAllowlistURLElement(newURL);
              });
            }
          });
        }
      });
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
        let listIndex = options.highlighter.length;
        let listTitle =
          $('#NewPhraseList__title').val().length > 0
            ? $('#NewPhraseList__title').val()
            : 'Untitled';
        let listColor = rgbaStringToHex($('#NewPhraseList__color').css('background-color'));
        let listTextColor = rgbaStringToHex($('#NewPhraseList__color').css('color'));
        addNewListDiv(listTitle, listColor, listIndex);
        options.highlighter[listIndex] = {
          phrases: [],
          color: listColor,
          textColor: listTextColor,
          title: listTitle,
        };
        chrome.storage.local.set({ highlighter: options.highlighter }, () => {
          redoAllListStyles(options);
          $('#NewPhraseList__title').val('');
        });
      });
    });
  }

  function setupPhraseListHandlers($list) {
    setupPhraseListEditColorHandler($list);
    setupPhraseListEditNameHandler($list);
    setupPhraseListImportHandler($list);
    setupPhraseListExportHandler($list);
    setupPhraseListDeleteHandler($list);
    setupPhraseListAddPhraseHandler($list);
    setupPhraseListDeletePhraseHandler($list);
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
      var oldListName = $list.find('.PhraseList__title').text();
      if (window.confirm(`Are you sure you want to delete ${oldListName}?`)) {
        chrome.storage.local.get((options) => {
          options.highlighter[$list.data('index')] = {};
          chrome.storage.local.set({ highlighter: options.highlighter }, () => {
            $list.remove();
          });
        });
      }
    });
  }

  function setupPhraseListAddPhraseHandler($list) {
    let listIndex = $list.data('index');
    $list.on('click', '.PhraseList__newPhrase__add', (e) => {
      e.preventDefault();
      let newPhrase = $list.find('.PhraseList__newPhrase__phrase').val();
      if (newPhrase.length > 0) {
        chrome.storage.local.get((options) => {
          if (options.highlighter[listIndex].phrases.includes(newPhrase)) {
            $list.find('.PhraseList__newPhrase__phrase').val('');
            alert('Phrase was already in list!');
          } else {
            options.highlighter[listIndex].phrases.push(newPhrase.trim());
            $list.find('.PhraseList__newPhrase__phrase').val('');
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
          if (!phraseListKeys.includes('title') || typeof phraseList['title'] !== 'string') {
            throw new Error(`List ${i} must have proper "title" string property`);
          }
          if (
            !phraseListKeys.includes('color') ||
            typeof phraseList['color'] !== 'string' ||
            !phraseList['color'].match(/#[a-f\d]{3}(?:[a-f\d]?|(?:[a-f\d]{3}(?:[a-f\d]{2})?)?)\b/)
          ) {
            throw new Error(
              `List ${i} must have proper "color" property with hexidecimal color string, e.g. "#ffffff"`,
            );
          }
          if (!phraseListKeys.includes('phrases') || !Array.isArray(phraseList['phrases'])) {
            throw new Error(
              `List ${i} must have proper "phrases" property with array of phrases, e.g. ["Hello", "world"]`,
            );
          }
          for (phrase of phraseList['phrases']) {
            if (typeof phrase !== 'string') {
              throw new Error(`List ${i}'s phrases must be all strings, e.g. ["Hello", "world"].`);
            }
          }
          newImportLists.push({
            color: phraseList['color'],
            phrases: phraseList['phrases'],
            textColor: getTextColor(phraseList['color']),
            title: phraseList['title'],
          });
        });

        // Set up the new highlighter object as preview, then setup & open the modal
        // Note that because chrome.storage.local.get is async, we have to put the modal set up inside that call.
        let newHighlighter = [];
        if (importType === 'ImportAsNew') {
          chrome.storage.local.get((options) => {
            newHighlighter = options.highlighter
              .concat(newImportLists)
              .filter((list) => Object.keys(list).length > 0);
            setupBulkImportPreviewModal(newHighlighter);
          });
        } else if (importType === 'ImportAndMerge') {
          chrome.storage.local.get((options) => {
            // Create a copy of existing lists to be able to merge with.
            const existingLists = Object.assign(options.highlighter).filter(
              (list) => Object.keys(list).length > 0,
            );
            const newListsToAppend = [];
            newImportLists.forEach((newList) => {
              const existingListsWithSameName = existingLists.filter(
                (list) => list.title === newList.title,
              );
              if (existingListsWithSameName.length > 0) {
                const existingListToMerge = existingListsWithSameName[0];
                existingListToMerge.phrases = arrayMerge(
                  existingListToMerge.phrases,
                  newList.phrases,
                );
                existingListToMerge.color = newList.color;
              } else {
                newListsToAppend.push(newList);
              }
              newHighlighter = existingLists.concat(newListsToAppend);
              setupBulkImportPreviewModal(newHighlighter);
            });
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
        let highlighterExport = [];
        let phraseCount = 0;
        let phraseListCount = 0;
        Object.values(options.highlighter).forEach((phraseList) => {
          if (Object.keys(phraseList).length > 0) {
            phraseListCount++;
            phraseCount += phraseList.phrases.length;
            highlighterExport.push({
              title: phraseList.title,
              color: phraseList.color,
              phrases: phraseList.phrases,
            });
          }
        });
        const highlightyExportText = JSON.stringify(highlighterExport, null, 2);
        $('#BulkExportModal__body').val(highlightyExportText);
        $('#BulkExportModal__phraseListCount').text(phraseListCount);
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
      let exportFormat = $('#ExportModal__tabs li.is-active').attr('id').split('--')[1];
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
    $('#ImportModal__submit').on('click', (e) => {
      let phraseCount = $('#ImportModal__phraseCount').text();
      if (phraseCount > 0) {
        chrome.storage.local.get((options) => {
          let listIndex = $('#ImportModal').data('index');
          let currentPhraseList = options.highlighter[listIndex].phrases;
          let importFormat = $('#ImportModal__tabs li.is-active').attr('id').split('--')[1];
          let phrasesToAdd = [];
          if (importFormat === 'Space-Delimited') {
            phrasesToAdd = $('#ImportModal__body').val().match(/\S+/g) || [];
          } else if (importFormat == 'Line-Delimited') {
            phrasesToAdd =
              $('#ImportModal__body')
                .val()
                .split('\n')
                .filter((p) => p.trim() != '') || [];
          }
          let phrasesSkipped = 0,
            phrasesAdded = 0;
          for (let phrase of phrasesToAdd) {
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

  function setHighlightBadge(options) {
    let mode = options.enableAutoHighlight ? 'autoHighlighter' : 'manualHighlighter';
    let status = options.enableAutoHighlight && options.autoHighlighter;
    chrome.runtime.sendMessage({ [mode]: status });
  }

  chrome.storage.local.get((options) => {
    setupOptionsPage(options);
  });

  $('#Settings__save').on('click', (e) => {
    chrome.storage.local.get((options) => {
      let newEnableAutoHighlight = $('#Settings__enableAutoHighlight').is(':checked');
      let newEnableAutoHighlightUpdates = $('#Settings__enableAutoHighlightUpdates').is(':checked');
      let newEnableTitleMouseover = $('#Settings__enableTitleMouseover').is(':checked');
      let newEnablePartialMatch = $('#Settings__enablePartialMatch').is(':checked');
      let newEnableCaseInsensitive = $('#Settings__enableCaseInsensitive').is(':checked');
      let newKeyboardShortcut = $('#Settings__keyboardShortcut').val();
      let newEnableURLDenylist = $('#Settings__enableURLDenylist').is(':checked');
      let newEnableURLAllowlist = $('#Settings__enableURLAllowlist').is(':checked');

      let newOptions = {
        enableAutoHighlight: newEnableAutoHighlight,
        enableAutoHighlightUpdates: newEnableAutoHighlightUpdates,
        enableTitleMouseover: newEnableTitleMouseover,
        enablePartialMatch: newEnablePartialMatch,
        enableCaseInsensitive: newEnableCaseInsensitive,
        enableURLDenylist: newEnableURLDenylist,
        enableURLAllowlist: newEnableURLAllowlist,
        keyboardShortcut: newKeyboardShortcut,
      };

      if (newEnableAutoHighlight !== options.newEnableAutoHighlight) {
        newOptions.autoHighlighter = true; // No harm in setting this to true either way.
        setHighlightBadge(newOptions);
      }

      chrome.storage.local.set(newOptions, () => {
        alert('Settings saved!');
      });
    });
  });

  function pluralize(count, noun, suffix = 's') {
    return `${count} ${noun}${count !== 1 ? suffix : ''}`;
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
