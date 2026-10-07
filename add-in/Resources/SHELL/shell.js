// The page of the detached help window: the pane's elements, with the same ids,
// and the add-in at the other end of window.chrome.webview. A message either
// way is "verb:payload", split at the first colon.
//
// Page to add-in: ready, search:<text>, enter, pick:<entry>, hover:<1|0>,
// attach, browser, frame:<src> (the frame has loaded src), and from the title
// bar drag (start moving the window), minimize, maxrestore, close.
// Add-in to page: theme:<group> a line break and <css>, search:<text>,
// results:<html>, page:<url>, summary:<html>, hover:<1|0>, hoverdisabled:<1|0>,
// browser:<1|0 enabled>, focus:, chrome:<custom|native> (whether the page
// draws the title bar), state:<min|max|normal> (the window's).
(function () {
  var host = window.chrome.webview;
  var byId = function (id) { return document.getElementById(id); };
  var root = document.documentElement;
  var search = byId("helpSearch");
  var results = byId("helpResults");
  var summary = byId("helpSummary");
  var frame = byId("helpPage");
  var browser = byId("helpBrowser");
  var hover = byId("helpHover");
  var titleBar = byId("helpTitleBar");
  var attach = byId("helpAttach");
  var maximize = byId("helpMaximize");

  function post(text) { host.postMessage(text); }

  // A drag on the bar moves the window: it starts when the mouse has moved a
  // few pixels with the left button down, or after the button has been held
  // for 250 ms as in the IDE's own title bar. Until then a double click still
  // arrives as one, and maximizes or restores the window. The system's move
  // loop takes the mouse once it runs, so nothing here follows the drag.
  var HOLD_MS = 250;
  var MOVE_PX = 4;
  var press = null;

  function endPress() {
    if (press) clearTimeout(press.timer);
    press = null;
  }

  function startDrag() {
    endPress();
    post("drag");
  }

  titleBar.addEventListener("mousedown", function (e) {
    if (e.button !== 0 || e.target.closest("button")) return;
    endPress();
    press = { x: e.clientX, y: e.clientY, timer: setTimeout(startDrag, HOLD_MS) };
  });
  document.addEventListener("mousemove", function (e) {
    if (!press) return;
    if ((e.buttons & 1) === 0) { endPress(); return; }
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > MOVE_PX) startDrag();
  });
  document.addEventListener("mouseup", endPress);
  titleBar.addEventListener("dblclick", function (e) {
    if (e.button === 0 && !e.target.closest("button")) post("maxrestore");
  });
  byId("helpMinimize").addEventListener("click", function () { post("minimize"); });
  maximize.addEventListener("click", function () { post("maxrestore"); });
  byId("helpClose").addEventListener("click", function () { post("close"); });

  search.addEventListener("input", function () { post("search:" + search.value); });
  search.addEventListener("keyup", function (e) {
    if (e.key !== "Enter") return;
    post("search:" + search.value);
    post("enter");
  });
  results.addEventListener("click", function (e) {
    var row = e.target.closest(".hit");
    if (row) post("pick:" + row.getAttribute("data-pick"));
  });
  hover.addEventListener("change", function () { post("hover:" + (hover.checked ? "1" : "0")); });
  browser.addEventListener("click", function () { post("browser"); });
  attach.addEventListener("click", function () { post("attach"); });
  frame.addEventListener("load", function () {
    if (frame.getAttribute("src")) post("frame:" + frame.src);
  });

  // The IDE's theme: its group for the plain palette, and its properties.
  function setTheme(payload) {
    var line = payload.indexOf("\n");
    document.documentElement.setAttribute("data-group", line < 0 ? payload : payload.slice(0, line));
    byId("theme").textContent = line < 0 ? "" : payload.slice(line + 1);
  }

  // Where Attach is: a button in the title bar when the page draws one, a
  // button in the search bar, before the Hover help box, when the window has
  // the Windows title bar.
  function setChrome(chrome) {
    root.setAttribute("data-chrome", chrome);
    if (chrome === "native") byId("helpBar").insertBefore(attach, byId("helpHoverLabel"));
    else titleBar.insertBefore(attach, byId("helpMinimize"));
  }

  // The window's state, which the Maximize button shows.
  function setState(state) {
    root.setAttribute("data-state", state);
    var label = state === "max" ? "Restore" : "Maximize";
    maximize.title = label;
    maximize.setAttribute("aria-label", label);
  }

  function showPage(url) {
    frame.src = url;
    frame.style.display = "";
    summary.style.display = "none";
  }

  function showSummary(html) {
    summary.innerHTML = html;
    summary.style.display = "";
    frame.style.display = "none";
  }

  function setResults(html) {
    results.innerHTML = html;
    results.style.display = html ? "" : "none";
  }

  host.addEventListener("message", function (e) {
    var text = String(e.data);
    var colon = text.indexOf(":");
    var verb = colon < 0 ? text : text.slice(0, colon);
    var payload = colon < 0 ? "" : text.slice(colon + 1);
    switch (verb) {
      case "theme": setTheme(payload); break;
      case "search": search.value = payload; break;
      case "results": setResults(payload); break;
      case "page": showPage(payload); break;
      case "summary": showSummary(payload); break;
      case "hover": hover.checked = payload === "1"; break;
      case "hoverdisabled": hover.disabled = payload === "1"; break;
      case "browser": browser.disabled = payload !== "1"; break;
      case "focus": search.focus(); break;
      case "chrome": setChrome(payload); break;
      case "state": setState(payload); break;
    }
  });

  post("ready");
})();
