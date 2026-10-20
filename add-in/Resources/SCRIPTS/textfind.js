// Find in the text boxes of the IDE's configuration editors (Window > Keyboard
// Shortcuts > Manage Keyboard Shortcuts, and Manage Panel Layouts), which are
// plain text areas with no find of their own, inside a dialog where the IDE's
// key handling does nothing. The keys are those of Visual Studio and VS Code:
//   Ctrl+F            opens a find box over the text area;
//   Enter, F3         select the next match of the query, Shift+Enter, Shift+F3
//                     the one before, from the selection and round past the end;
//   F3, Shift+F3      also work with the box closed, on the last query, and with
//                     no query yet F3 opens the box;
//   Ctrl+F3, Ctrl+Shift+F3
//                     take the selection (when on one line), or else the word at
//                     the caret, as the query, and find the next or previous
//                     match without opening the box;
//   Esc               closes the box only: the dialog stays open.
// A match is found in any case. Running this again replaces what an earlier run
// put in, and puts in nothing when it is turned off.
var on = $ON$;
var old = window.tbDocsTextFind;
if (old) {
  window.removeEventListener("keydown", old.down, true);
  if (old.bar) old.bar.remove();
  window.tbDocsTextFind = null;
}
if (on) {
var EDITOR = "textarea.genericMonospaceTextArea";
var state = { bar: null, input: null, area: null, query: "" };

var barOpen = function () {
  return state.bar !== null && state.bar.isConnected;
};

var close = function (focusArea) {
  if (state.bar) state.bar.remove();
  var area = state.area;
  state.bar = state.input = state.area = null;
  if (focusArea && area && area.isConnected) area.focus();
};

// Where the text from start to end is, in the text area's scrolling space (the
// origin is its padding box's top left, before any scrolling): measured in an
// off-screen copy of the text area's text, set the same way and as wide, with
// the match in a span. A match that wraps has the first line's top and left and
// the last line's bottom.
var matchRect = function (area, start, end) {
  var cs = getComputedStyle(area);
  var mirror = document.createElement("div");
  var props = [
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant", "letterSpacing",
    "lineHeight", "textTransform", "textIndent", "wordSpacing", "tabSize",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "whiteSpace", "overflowWrap", "wordBreak", "direction"
  ];
  for (var i = 0; i < props.length; i++) mirror.style[props[i]] = cs[props[i]];
  mirror.style.cssText +=
    ";position:absolute;visibility:hidden;left:-99999px;top:0;box-sizing:border-box;border:0;margin:0;" +
    "overflow:visible;width:" + area.clientWidth + "px";
  var span = document.createElement("span");
  span.textContent = area.value.substring(start, end) || "​";
  mirror.appendChild(document.createTextNode(area.value.substring(0, start)));
  mirror.appendChild(span);
  mirror.appendChild(document.createTextNode(area.value.substring(end) + "​"));
  document.body.appendChild(mirror);
  var origin = mirror.getBoundingClientRect();
  var rects = span.getClientRects();
  var first = rects[0];
  var last = rects[rects.length - 1];
  var right = -Infinity;
  for (var j = 0; j < rects.length; j++) right = Math.max(right, rects[j].right);
  var r = {
    top: first.top - origin.top,
    bottom: last.bottom - origin.top,
    left: first.left - origin.left,
    right: right - origin.left,
    wraps: cs.whiteSpace.indexOf("pre-wrap") >= 0 || cs.whiteSpace === "normal" || cs.whiteSpace === "pre-line"
  };
  mirror.remove();
  return r;
};

// Whether the selection is in view, and not under the find box, with the rect
// matchRect gives for it.
var visibleState = function (area) {
  var r = matchRect(area, area.selectionStart, area.selectionEnd);
  var box = area.getBoundingClientRect();
  var left = box.left + area.clientLeft + r.left - area.scrollLeft;
  var right = box.left + area.clientLeft + r.right - area.scrollLeft;
  var top = box.top + area.clientTop + r.top - area.scrollTop;
  var bottom = box.top + area.clientTop + r.bottom - area.scrollTop;
  var inView =
    r.top >= area.scrollTop &&
    r.bottom <= area.scrollTop + area.clientHeight &&
    (r.wraps || (r.left >= area.scrollLeft && r.right <= area.scrollLeft + area.clientWidth));
  var covered = false;
  if (barOpen()) {
    var b = state.bar.getBoundingClientRect();
    covered = left < b.right && right > b.left && top < b.bottom && bottom > b.top;
  }
  return { visible: inView && !covered, covered: covered, rect: r, cover: barOpen() ? state.bar.offsetHeight + 8 : 0 };
};

// Selects the match and scrolls so that it shows, about a third down the text
// area and clear of the find box.
var select = function (area, at, length) {
  area.focus();
  area.setSelectionRange(at, at + length);
  area.blur();
  area.focus();
  area.setSelectionRange(at, at + length);
  var v = visibleState(area);
  if (v.visible) return;
  var r = v.rect;
  area.scrollTop = Math.max(0, r.top - Math.max(v.cover, area.clientHeight / 3));
  if (!r.wraps) area.scrollLeft = Math.max(0, r.left - area.clientWidth / 3);
};

var find = function (area, backwards) {
  if (barOpen()) state.query = state.input.value;
  var query = state.query.toLowerCase();
  if (!area || !area.isConnected || !query) return;
  var text = area.value.toLowerCase();
  var at;
  if (backwards) {
    at = area.selectionStart > 0 ? text.lastIndexOf(query, area.selectionStart - 1) : -1;
    if (at < 0) at = text.lastIndexOf(query);
  } else {
    at = text.indexOf(query, area.selectionEnd);
    if (at < 0) at = text.indexOf(query);
  }
  if (barOpen()) {
    state.input.classList.toggle("tbDocsFindMissing", at < 0);
    state.input.title = at < 0 ? "No match" : "";
  }
  if (at >= 0) select(area, at, query.length);
};

var open = function (area) {
  if (state.area !== area || !barOpen()) {
    close(false);
    var host = area.parentNode;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    var bar = document.createElement("div");
    bar.className = "tbDocsFindBar";
    bar.style.cssText =
      "position:absolute;top:4px;right:20px;z-index:10;display:flex;gap:4px;padding:3px;" +
      "background:var(--themeGeneralPanelBackColor);border:var(--themePropertySheetValueBorderColor);" +
      "box-shadow:0 2px 6px rgba(0,0,0,0.35)";
    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Find";
    input.setAttribute("aria-label", "Find");
    input.value = state.query;
    input.style.cssText =
      "width:180px;font:inherit;color:var(--themeToolWindowBodyForeColor);" +
      "background:var(--themeGeneralPanelBackColor);border:var(--themePropertySheetValueBorderColor);outline:none";
    bar.appendChild(input);
    host.appendChild(bar);
    state.bar = bar;
    state.input = input;
    state.area = area;
    window.tbDocsTextFind.bar = bar;
  }
  var picked = area.value.substring(area.selectionStart, area.selectionEnd);
  if (picked && picked.indexOf("\n") < 0) state.input.value = picked;
  state.input.focus();
  state.input.select();
};

// The query for Ctrl+F3: the selection when it is on one line, else the word at
// the caret (letters, digits and _), which is then selected, so that a search
// backwards goes before it.
var takeQuery = function (area) {
  var picked = area.value.substring(area.selectionStart, area.selectionEnd);
  if (picked && picked.indexOf("\n") < 0) return picked;
  var text = area.value;
  var start = area.selectionStart;
  var end = start;
  var isWord = function (c) {
    return /[A-Za-z0-9_]/.test(c);
  };
  while (start > 0 && isWord(text.charAt(start - 1))) start--;
  while (end < text.length && isWord(text.charAt(end))) end++;
  if (start === end) return "";
  area.setSelectionRange(start, end);
  return text.substring(start, end);
};

var down = function (e) {
  var target = e.target;
  var inArea = target instanceof HTMLTextAreaElement && target.matches(EDITOR);
  var inBox = state.input !== null && target === state.input;
  if (!inArea && !inBox) return;
  var area = inArea ? target : state.area;
  var handled = true;
  if (e.ctrlKey && !e.altKey && e.code === "KeyF") {
    open(area);
  } else if (e.key === "F3" && e.ctrlKey && !e.altKey) {
    var word = takeQuery(area);
    if (word) {
      state.query = word;
      if (barOpen()) state.input.value = word;
      find(area, e.shiftKey);
    }
  } else if (e.key === "F3" && !e.altKey) {
    if (barOpen() || state.query) find(area, e.shiftKey);
    else open(area);
  } else if (inBox && e.key === "Enter") {
    find(area, e.shiftKey);
  } else if (barOpen() && e.key === "Escape") {
    close(true);
  } else {
    handled = false;
  }
  if (handled) {
    e.preventDefault();
    e.stopPropagation();
  }
};

window.addEventListener("keydown", down, true);
window.tbDocsTextFind = { down: down, bar: null, visible: visibleState };
var style = document.getElementById("tbDocsFindStyle");
if (!style) {
  style = document.createElement("style");
  style.id = "tbDocsFindStyle";
  style.textContent = ".tbDocsFindBar input.tbDocsFindMissing{border-color:#c03030 !important}";
  document.head.appendChild(style);
}
}
