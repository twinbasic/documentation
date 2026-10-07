// The page of the detached help window: the pane's elements, with the same ids,
// and the add-in at the other end of window.chrome.webview. A message either
// way is "verb:payload", split at the first colon.
//
// Page to add-in: ready, search:<text>, enter, pick:<entry>, hover:<1|0>,
// attach, browser, frame:<src> (the frame has loaded src).
// Add-in to page: theme:<group> a line break and <css>, search:<text>,
// results:<html>, page:<url>, summary:<html>, hover:<1|0>, hoverdisabled:<1|0>,
// browser:<1|0 enabled>, focus:.
(function () {
  var host = window.chrome.webview;
  var byId = function (id) { return document.getElementById(id); };
  var search = byId("helpSearch");
  var results = byId("helpResults");
  var summary = byId("helpSummary");
  var frame = byId("helpPage");
  var browser = byId("helpBrowser");
  var hover = byId("helpHover");

  function post(text) { host.postMessage(text); }

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
  byId("helpAttach").addEventListener("click", function () { post("attach"); });
  frame.addEventListener("load", function () {
    if (frame.getAttribute("src")) post("frame:" + frame.src);
  });

  // The IDE's theme: its group for the plain palette, and its properties.
  function setTheme(payload) {
    var line = payload.indexOf("\n");
    document.documentElement.setAttribute("data-group", line < 0 ? payload : payload.slice(0, line));
    byId("theme").textContent = line < 0 ? "" : payload.slice(line + 1);
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
    }
  });

  post("ready");
})();
