// Fix for export-verbose-done-escaped and twinbasic#2444: text that continues an
// open DEBUG CONSOLE line is escaped once, not twice. Written on BETA 1010; the local
// names are ours (scripts/ide-js/names.json), not twinBASIC's. Applied with
// `node scripts/ide_js.mjs patch bugs/export-verbose-done-escaped/fix.js --copy-to <dir>`.
function debugOutputPartial(text, colorClass, isHTML, timeStamp) {
  var endsLine = text.endsWith("\r\n");
  if (endsLine) {
    text = text.substr(0, text.length - 2);
  }
  if (debugConsolePartialLineItem) {
    let lineHTML = debugConsoleContent.onAsyncGetItemHTML(debugConsolePartialLineItem);
    if (debugConsolePartialLineItem_LastColorClass === colorClass) {
      text = isHTML ? text : TEXTtoHTML(text);
    } else {
      text = "</span><span class='" + colorClass + "'>" + (isHTML ? text : TEXTtoHTML(text));
    }
    var addedHTML = text;
    debugConsoleContent.updateItem(
      debugConsolePartialLineItem,
      lineHTML + addedHTML + (endsLine ? "</span>" : ""),
    );
  } else {
    let stampHTML = "<span class='ts'>";
    if (timeStamp) {
      stampHTML += timeStamp;
    } else {
      stampHTML += GetJsTimeStamp();
    }
    debugConsolePartialLineItem = debugConsoleContent.addItem(
      "<span class='" +
        colorClass +
        "'>" +
        stampHTML +
        "</span>" +
        (isHTML ? text : TEXTtoHTML(text)) +
        (endsLine ? "</span>" : ""),
    );
  }
  if (endsLine) {
    debugConsolePartialLineItem = undefined;
  }
  debugConsolePartialLineItem_LastColorClass = colorClass;
}
