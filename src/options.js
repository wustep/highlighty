$(function() {

  function setupOptionsPage(options) {
    removeExistingListStyles();
    setupPrimarySettings(options);
    addExistingListStyles(options);
    addExistingLists(options);
  }

  // Setup primary settings (mouseover, etc.)
  function setupPrimarySettings(options) { // TODO: Validation & set defaults here?
    $("#hl-mouseover-checkbox").attr('checked', options.enableContextMouseover);
    $("#hl-keyboard-shortcut").attr('value', options.keyboardShortcut);
  }

  function removeExistingListStyles() {
    $('#hl-styles').remove();
  }

  function addExistingListStyles(options) {
    let highlighterStyles = "<style id='hl-styles'>span.hl-word { " + options.baseStyles + " } ";
    for (let i = 0; i < options.highlighter.length; i++) {
      let highlighterColor = ("color" in options.highlighter[i]) ? options.highlighter[i].color : "black";
      highlighterStyles += "span.hl-word-from-" + i + " { background-color: " + highlighterColor + " }\r\n";
    }
    highlighterStyles += "</style>";
    $("head").append(highlighterStyles);
  }

  function addExistingLists(options) {
    for (let i = 0; i < options.highlighter.length; i++) {
      let newListDiv = $("#hl-invisible-list")
          .clone()
          .attr('id', "hl-list-" + i)
      newListDiv.find(".hl-list-name").html(options.highlighter[i].context);
      for (let j = 0; j < options.highlighter[i].words.length; j++) {
        newListDiv.find(".hl-words").append(
          "<span class='tag is-medium hl-word hl-word-from-" + i +
              "' id='hl-word-" + i + "-" + j + "'>" +
              options.highlighter[i].words[j] +
              "<button class='delete is-small hl-delete-word'></button>" +
          "</span>");
      }
      newListDiv.insertBefore("#hl-add-new-list");
    }
  }

  chrome.storage.local.get(function(options) {
    setupOptionsPage(options);
  });

  $("#hl-primary-settings-save").on("click", function(e) {
    let newKeyboardShortcut = $("#hl-keyboard-shortcut").val();
    console.log(newKeyboardShortcut);
    let newEnableContextMouseover = $("#hl-mouseover-checkbox").is(":checked");
    console.log(newEnableContextMouseover);
    chrome.storage.local.set(
      {
        "keyboardShortcut": newKeyboardShortcut,
        "enableContextMouseover": newEnableContextMouseover
      },
      function() {
        alert("Settings saved!");
      });
  });
});
