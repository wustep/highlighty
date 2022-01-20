/* Highlighty.js | by Stephen Wu */

$(function () {
  const HL_STYLE_ID = 'HighlighterStyles'; // Style block containing highlighter styles

  function setupOptionsPage(options) {
    removeExistingListStyles();
    setPrimarySettings(options);

    addExistingURLLists(options);
    addExistingListStyles(options);
    addExistingLists(options);

    setupAutoHighlightHandler();
    setupURLListHandlers();
    setupAddPhraseListHandler();
    setupImportExportModals();
  }

  function removeExistingListStyles() {
    $(`.${HL_STYLE_ID}`).remove();
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
    let highlighterStyles = `<style id="${HL_STYLE_ID}">span.PhraseList__phrase, span.Denylist__url { ${options.baseStyles} }\r\n`;
    for (let i = 0; i < options.highlighter.length; i++) {
      if (Object.keys(options.highlighter[i]).length) {
        // Skip deleted lists!
        let highlighterColor = options.highlighter[i].color || 'black';
        let textColor = options.highlighter[i].textColor || 'white';
        highlighterStyles += `span.PhraseList__phrase--${i} { background-color: ${highlighterColor}; color: ${textColor} }\r\n`;
      }
    }
    highlighterStyles += '</style>';
    $('head').append(highlighterStyles);
  }

  function addExistingLists(options) {
    for (let i = 0; i < options.highlighter.length; i++) {
      if (Object.keys(options.highlighter[i]).length) {
        let $newListDiv = addNewListDiv(
          options.highlighter[i].title,
          options.highlighter[i].color,
          i,
        );
        for (let j = 0; j < options.highlighter[i].phrases.length; j++) {
          addPhraseElement($newListDiv, options.highlighter[i].phrases[j], i);
        }
      }
    }
  }

  function addNewListDiv(title, color, index) {
    $newListDiv = $('#PhraseList--invisible')
      .clone()
      .attr('id', `PhraseList--${index}`)
      .data('index', index);
    $newListDiv.find('.PhraseList__color').css('background-color', color);
    $newListDiv.find('.PhraseList__title').text(title);
    setupPhraseListHandlers($newListDiv);
    $newListDiv.insertBefore('#NewPhraseList');
    return $newListDiv;
  }

  function addPhraseElement($listDiv, phrase, listIndex) {
    $listDiv
      .find('.PhraseList__phrases')
      .append(
        `<span class="tag is-medium PhraseList__phrase PhraseList__phrase--${listIndex}"` +
          ` data-list="${listIndex}">` +
          phrase +
          `<button class="delete is-small PhraseList__phrase__delete"></button>` +
          `</span>`,
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
      color: '#dbeb',
      parent: colorInput,
      popup: 'top',
      onDone: (color) => {
        colorInput.style['background-color'] = rgbaToHex(color._rgba);
        colorInput.style['color'] = getTextColor(color._rgba);
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
          /* TODO: [Low] Add styles smarter here instead of redoing them all
               We redo them all in case of an index taking the spot of an old deleted list */
          removeExistingListStyles();
          addExistingListStyles(options);
          $('#NewPhraseList__title').val('');
        });
      });
    });
  }

  /**
   * Returns black or white based on the background color provided.
   * backgroundColor should be Array of [r,g,b]
   * https://stackoverflow.com/a/1855903
   */
  function getTextColor(rgb) {
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
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
        const newColorHexString = rgbaToHex(newColor._rgba);
        colorButton.style['background-color'] = newColorHexString;
        colorPicker.setOptions({ color: newColorHexString });
        chrome.storage.local.get((options) => {
          options.highlighter[$list.data('index')].color = newColorHexString;
          options.highlighter[$list.data('index')].textColor = getTextColor(newColor._rgba);
          chrome.storage.local.set({ highlighter: options.highlighter }, () => {
            /* TODO: [Low] Edit styles smarter here instead of redoing them all? */
            removeExistingListStyles();
            addExistingListStyles(options);
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
      if (window.confirm('Are you sure you want to delete: ' + $phrase.text() + '?')) {
        chrome.storage.local.get((options) => {
          let phraseIndex = options.highlighter[listIndex].phrases.indexOf($phrase.text());
          options.highlighter[listIndex].phrases.splice(phraseIndex, 1);
          chrome.storage.local.set({ highlighter: options.highlighter }, () => {
            $phrases.find($phrase).remove();
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

  function setupImportExportModals() {
    setupImportExportTabHandlers();
    setupImportExportCloseHandlers();
    setupImportExportPhraseCountHandler();
    setupImportSubmitButton();
    setupExportCopyButton();
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
   * Given rgba array, convert to hex string
   * e.g. [187, 0, 0, 1], -> "#BB0000"
   * https://stackoverflow.com/a/3627747
   */
  function rgbaToHex(rgba) {
    const hex = `#${rgba
      .filter((v, i) => i <= 3 || v == 1.0)
      .map((n, i) =>
        (i === 3 ? Math.round(parseFloat(n) * 255) : parseFloat(n))
          .toString(16)
          .padStart(2, '0')
          .replace('NaN', ''),
      )
      .join('')}`;
    return hex.length > 7 && hex.slice(-2) === 'ff' ? hex.slice(0, 7) : hex;
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
});
