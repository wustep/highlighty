/* Highlighty.js | by Stephen Wu */

$(function() {

  const HL_STYLE_ID = "HighlighterStyles"; // Style block containing highlighter styles

  function setupOptionsPage(options) {
    removeExistingListStyles();
    setupPrimarySettings(options);
    setupAddPhraseListHandler();
    addExistingListStyles(options);
    addExistingLists(options);
  }

  function removeExistingListStyles() {
    $(`.${HL_STYLE_ID}`).remove();
  }

  function setupPrimarySettings(options) {
    $("#Settings__enableManualHighlight").attr('checked', options.enableManualHighlight);
    $("#Settings__enableTitleMouseover").attr('checked', options.enableTitleMouseover);
    $("#Settings__enablePartialMatch").attr('checked', options.enablePartialMatch);
    $("#Settings__enableCaseInsensitive").attr('checked', options.enableCaseInsensitive);
    $("#Settings__keyboardShortcut").val(options.keyboardShortcut);
  }

  function setupAddPhraseListHandler() {
    $("#NewPhraseList__add").on("click", (e) => {
      e.preventDefault();
      chrome.storage.local.get((options) => {
        let listIndex = options.highlighter.length;
        let listTitle = $("#NewPhraseList__title").val().length > 0
            ? $("#NewPhraseList__title").val()
            : "Untitled";
        let listColor = $("#NewPhraseList__color").val().length > 0
            ? $("#NewPhraseList__color").val()
            : "black";
        addNewListDiv(listTitle, listIndex);
        options.highlighter[listIndex] = {
          phrases: [],
          color: listColor,
          title: listTitle
        };
        chrome.storage.local.set({"highlighter": options.highlighter},
          () => {
            /* TODO: [Low] Add styles smarter here instead of redoing them all
               We redo them all in case of an index taking the spot of an old deleted list */
            removeExistingListStyles();
            addExistingListStyles(options);
            $("#NewPhraseList__title").val("");
            $("#NewPhraseList__color").val("");
          });
      });
    });
  }

  function addExistingListStyles(options) {
    let highlighterStyles =
        `<style id="${HL_STYLE_ID}">span.PhraseList__phrase { ${options.baseStyles} }\r\n`;
    for (let i = 0; i < options.highlighter.length; i++) {
      if (Object.keys(options.highlighter[i]).length) { // Skip deleted lists!
        let highlighterColor = ("color" in options.highlighter[i])
            ? options.highlighter[i].color
            : "black";
        highlighterStyles += `span.PhraseList__phrase--${i} { background-color: ${highlighterColor} }\r\n`;
      }
    }
    highlighterStyles += "</style>";
    $("head").append(highlighterStyles);
  }

  function addExistingLists(options) {
    for (let i = 0; i < options.highlighter.length; i++) {
      if (Object.keys(options.highlighter[i]).length) {
        let $newListDiv = addNewListDiv(options.highlighter[i].title, i);
        for (let j = 0; j < options.highlighter[i].phrases.length; j++) {
          addPhrase($newListDiv, options.highlighter[i].phrases[j], i);
        }
      }
    }
  }

  function addNewListDiv(title, index) {
    $newListDiv = $("#PhraseList--invisible").clone()
        .attr('id', `PhraseList--${index}`)
        .data('index', index);
    $newListDiv.find(".PhraseList__title").text(title);
    setupPhraseListHandlers($newListDiv);
    $newListDiv.insertBefore("#NewPhraseList");
    return $newListDiv;
  }

  function addPhrase($listDiv, phrase, listIndex) {
    $listDiv.find(".PhraseList__phrases").append(
      `<span class="tag is-medium PhraseList__phrase PhraseList__phrase--${listIndex}"` +
           ` data-list="${listIndex}">` +
          phrase +
          `<button class="delete is-small PhraseList__phrase__delete"></button>` +
      `</span>`
    );
  }

  function setupPhraseListHandlers(list) {
    setupPhraseListEditNameHandler(list);
    setupPhraseListDeleteHandler(list);
    setupPhraseListAddPhraseHandler(list);
    setupPhraseListDeletePhraseHandler(list);
  }

  function setupPhraseListEditNameHandler(list) {
    list.on("click", ".PhraseList__editName", () => {
      var oldListName = list.find(".PhraseList__title").text();
      var newListName = window.prompt("Please enter a new phrase list name", oldListName);
      if (newListName != null && newListName != "" && newListName != oldListName) {
        chrome.storage.local.get((options) => { // TODO: functionalize this?
          options.highlighter[list.data("index")].title = newListName;
          chrome.storage.local.set({ "highlighter": options.highlighter },
            () => { list.find(".PhraseList__title").text(newListName) }
          );
        });
      }
    });
  }

  function setupPhraseListDeleteHandler(list) {
    list.on("click", ".PhraseList__delete", () => {
      var oldListName = list.find(".PhraseList__title").text();
      if (window.confirm(`Are you sure you want to delete ${oldListName}?`)) {
        chrome.storage.local.get((options) => {
          options.highlighter[list.data("index")] = {};
          chrome.storage.local.set({ "highlighter": options.highlighter },
            () => { list.remove() }
          );
        });
      }
    });
  }

  function setupPhraseListAddPhraseHandler($list) {
    let listIndex = $list.data("index");
    $list.on("click", ".PhraseList__newPhrase__add", (e) => {
      e.preventDefault();
      let newPhrase = $list.find(".PhraseList__newPhrase__phrase").val();
      if (newPhrase.length > 0) {
        chrome.storage.local.get((options) => {
          if (options.highlighter[listIndex].phrases.includes(newPhrase)) {
            $list.find(".PhraseList__newPhrase__phrase").val("");
            alert("Phrase was already in list!");
          } else {
            options.highlighter[listIndex].phrases.push(newPhrase);
            $list.find(".PhraseList__newPhrase__phrase").val("");
            chrome.storage.local.set({ "highlighter": options.highlighter },
              () => { addPhrase($list, newPhrase, listIndex); }
            );
          }
        });
      }
    });
  }

  function setupPhraseListDeletePhraseHandler($list) {
    let listIndex = $list.data("index");
    let $phrases = $list.find(".PhraseList__phrases");
    $phrases.on("click", ".PhraseList__phrase__delete", (e) => {
      let $phrase = $(e.target).parent();
      if (window.confirm("Are you sure you want to delete: " + $phrase.text() + "?")) {
        chrome.storage.local.get((options) => {
          let phraseIndex = options.highlighter[listIndex].phrases.indexOf($phrase.text());
          options.highlighter[listIndex].phrases.splice(phraseIndex, 1);
          chrome.storage.local.set({ "highlighter": options.highlighter },
            () => { $phrases.find($phrase).remove(); }
          );
        });
      }
    });
  }

  chrome.storage.local.get((options) => { setupOptionsPage(options) });

  function getFakeImage(on) {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");

    ctx.fillStyle = (on) ? "yellow" : "black";
    ctx.fillRect(10, 10, 100, 100);

    return ctx.getImageData(50, 50, 100, 100);
  }

  $("#Settings__save").on("click", (e) => {
    chrome.storage.local.get((options) => {
      let newEnableManualHighlight = $("#Settings__enableManualHighlight").is(":checked");
      let newEnableTitleMouseover = $("#Settings__enableTitleMouseover").is(":checked");
      let newEnablePartialMatch = $("#Settings__enablePartialMatch").is(":checked");
      let newEnableCaseInsensitive = $("#Settings__enableCaseInsensitive").is(":checked");
      let newKeyboardShortcut = $("#Settings__keyboardShortcut").val();

      let newOptions = {
        "enableManualHighlight": newEnableManualHighlight,
        "enableTitleMouseover": newEnableTitleMouseover,
        "enablePartialMatch": newEnablePartialMatch,
        "enableCaseInsensitive": newEnableCaseInsensitive,
        "keyboardShortcut": newKeyboardShortcut
      };

      if (!newEnableManualHighlight && options.enableManualHighlight) {
        newOptions.autoHighlighter = true;
        chrome.browserAction.setIcon({imageData: getFakeImage(true)});
      } else if (newEnableManualHighlight) {
        chrome.browserAction.setIcon({imageData: getFakeImage(false)});
      }

      chrome.storage.local.set(
        newOptions,
        () => { alert("Settings saved!"); }
      );
    });
  });

});
