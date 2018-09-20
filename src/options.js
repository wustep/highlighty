$(function() {

  function setupOptionsPage(options) {
    removeExistingListStyles();
    addExistingListStyles(options);
    addExistingLists(options);
  }

  function removeExistingListStyles() {
    $('#highlighty-styles').remove();
  }

  function addExistingListStyles(options) {
    let highlighterStyles = "<style id='highlighty-styles'>span.highlighty-word { " + options.baseStyles + " } ";
    for (let i = 0; i < options.highlighter.length; i++) {
      let highlighterColor = ("color" in options.highlighter[i]) ? options.highlighter[i].color : "black";
      highlighterStyles += "span.highlighty-word-from-" + i + " { background-color: " + highlighterColor + " }\r\n";
    }
    highlighterStyles += "</style>";
    $("head").append(highlighterStyles);
  }

  function addExistingLists(options) {
    for (let i = 0; i < options.highlighter.length; i++) {
      let newListDiv = $("#highlighty-invisible-list")
          .clone()
          .attr('id', "highlighty-list-" + i)
      newListDiv.find(".highlighty-list-name").html(options.highlighter[i].context);
      for (let j = 0; j < options.highlighter[i].words.length; j++) {
        newListDiv.find(".highlighty-words").append(
          "<span class='tag is-medium highlighty-word highlighty-word-from-" + i + "'>" +
              options.highlighter[i].words[j] +
              "<button class='delete is-small'></button>" +
          "</span>");
      }
      newListDiv.insertBefore("#highlighty-add-new-list");
    }
  }

  chrome.storage.local.get(function(options) {
    setupOptionsPage(options);
  });
});
