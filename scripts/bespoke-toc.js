// A modified version of bespoke-bullets that supports explicit ordering of steps.
module.exports = function(options) {
  return function(deck) {
    var tocSection = document.getElementById("toc");

    var tocTitle = document.createElement("h2");
    tocTitle.textContent = "Plan du cours";
    tocSection.append(tocTitle);

    var toc = document.createElement("ul");
    tocSection.append(toc);

    var tocDetailElement = document.querySelector("#toc-detail aside[role=notes]");
    var tocDetailTitle = document.createElement("h2");
    tocDetailTitle.textContent = "Plan détaillé"
    tocDetailElement.append(tocDetailTitle);
    var tocDetail = document.createElement("ul");
    tocDetailElement.append(tocDetail);

    var sections = deck.slides;
    var length = sections.length;
    var lastTitle;

    for (var i = 1; i < length; i++) {
      var section = sections[i];

      var title = section.getElementsByTagName("h2").item(0);
      if (title == null 
            || section.className.indexOf("no-toc") != -1) {
        continue;
      }

      slideNumber = i+1;
      var tocEntryLine = document.createElement("li");
      var tocEntry = document.createElement("a");
      tocEntryLine.append(tocEntry);
      tocEntry.setAttribute('href', '#'+slideNumber);

      var tocText = document.createElement("span");
      tocEntry.append(tocText);
      tocText.textContent = title.textContent;

      var tocNumber = document.createElement("span");
      tocEntry.append(tocNumber);
      tocNumber.textContent = slideNumber;

      if (section.className.indexOf("title") != -1) {
        tocEntryLine.className = "toc1";
        if (section.className.indexOf("no-small-toc") == -1) {
          toc.append(tocEntryLine);
        }
        tocDetail.append(tocEntryLine.cloneNode(true));
      } else {
        if (lastTitle == null || title.textContent != lastTitle.textContent) {
          tocEntryLine.className = "toc2";
          tocDetail.append(tocEntryLine); 
        }
      }
      lastTitle = title;

    }
  }
}
