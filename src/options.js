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
    $('.' + HL_STYLE_ID).remove();
  }

  function setupPrimarySettings(options) {
    $("#Settings__enableTitleMouseover").attr('checked', options.enableTitleMouseover);
    $("#Settings__enablePartialMatch").attr('checked', options.enablePartialMatch);
    $("#Settings__enableCaseInsensitive").attr('checked', options.enableCaseInsensitive);
    $("#Settings__keyboardShortcut").val(options.keyboardShortcut);
  }

  function setupAddPhraseListHandler() {
    $("#NewPhraseList__add").on("click", function(e) {
      e.preventDefault();
      chrome.storage.local.get(function(options) {
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
          function() {
            // TODO: [Low] Add styles smarter instead of redoing them all
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
        let highlighterColor = ("color" in options.highlighter[i]) ? options.highlighter[i].color : "black";
        highlighterStyles += `span.PhraseList__phrase--from${i} { background-color: ${highlighterColor} }\r\n`;
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
    $newListDiv.find(".PhraseList__title").html(title);
    setupPhraseListHandlers($newListDiv);
    $newListDiv.insertBefore("#NewPhraseList");
    return $newListDiv;
  }

  function addPhrase($listDiv, phrase, listIndex) {
    $listDiv.find(".PhraseList__phrases").append(
      `<span class="tag is-medium PhraseList__phrase PhraseList__phrase--from${listIndex}"` +
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
    list.on("click", ".PhraseList__editName", function() {
      var oldListName = list.find(".PhraseList__title").text();
      var newListName = window.prompt("Please enter a new phrase list name", oldListName);
      if (newListName != null && newListName != "" && newListName != oldListName) {
        chrome.storage.local.get(function(options) { // TODO: functionalize this?
          options.highlighter[list.data("index")].title = newListName;
          chrome.storage.local.set({"highlighter": options.highlighter }, function() {
            list.find(".PhraseList__title").text(newListName); // TODO: This is safe, right?
          });
        });
      }
    });
  }

  function setupPhraseListDeleteHandler(list) {
    list.on("click", ".PhraseList__delete", function() {
      var oldListName = list.find(".PhraseList__title").text();
      if (window.confirm(`Are you sure you want to delete ${oldListName}?`)) {
        chrome.storage.local.get(function(options) {
          options.highlighter[list.data("index")] = {};
          chrome.storage.local.set({"highlighter": options.highlighter }, function() {
            list.remove();
          });
        });
      }
    });
  }

  function setupPhraseListAddPhraseHandler($list) {
    let listIndex = $list.data("index");
    $list.on("click", ".PhraseList__newPhrase__add", function(e) {
      e.preventDefault();
      let newPhrase = $list.find(".PhraseList__newPhrase__phrase").val();
      if (newPhrase.length > 0) {
        chrome.storage.local.get(function(options) {
          if (options.highlighter[listIndex].phrases.includes(newPhrase)) {
            $list.find(".PhraseList__newPhrase__phrase").val("");
            alert("Phrase was already in list!")
          } else {
            options.highlighter[listIndex].phrases.push(newPhrase);
            $list.find(".PhraseList__newPhrase__phrase").val("");
            chrome.storage.local.set({"highlighter": options.highlighter }, function() {
              addPhrase($list, newPhrase, listIndex);
            });
          }
        });
      }
    });
  }

  function setupPhraseListDeletePhraseHandler($list) {
    let listIndex = $list.data("index");
    let $phrases = $list.find(".PhraseList__phrases");
    $phrases.on("click", ".PhraseList__phrase__delete", function(e) {
      let $phrase = $(this).parent();
      if (window.confirm("Are you sure you want to delete: " + $phrase.text() + "?")) {
        chrome.storage.local.get(function(options) {
          let phraseIndex = options.highlighter[listIndex].phrases.indexOf($phrase.text());
          options.highlighter[listIndex].phrases.splice(phraseIndex, 1);
          chrome.storage.local.set({"highlighter": options.highlighter }, function() {
            $phrases.find($phrase).remove();
          });
        });
      }
    });
  }

  chrome.storage.local.get(function(options) {
    console.log(options);
    setupOptionsPage(options);
  });

  $("#Settings__save").on("click", function(e) {
    let newEnableTitleMouseover = $("#Settings__enableTitleMouseover").is(":checked");
    let newEnablePartialMatch = $("#Settings__enablePartialMatch").is(":checked");
    let newEnableCaseInsensitive = $("#Settings__enableCaseInsensitive").is(":checked");
    let newKeyboardShortcut = $("#Settings__keyboardShortcut").val();
    chrome.storage.local.set(
      {
        "enableTitleMouseover": newEnableTitleMouseover,
        "enablePartialMatch": newEnablePartialMatch,
        "enableCaseInsensitive": newEnableCaseInsensitive,
        "keyboardShortcut": newKeyboardShortcut
      },
      function() {
        alert("Settings saved!");
      });
  });
});
