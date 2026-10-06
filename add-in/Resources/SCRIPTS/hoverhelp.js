var sink = this.parentNode, on = $ON$, site = "$SITE$";
var old = window.tbDocsHoverHelp;
if (old) {
  old.provider.dispose();
  window.removeEventListener("click", old.click, true);
  for (var k in old.pending) old.pending[k]("");
  window.tbDocsHoverHelp = null;
}
if (on) {
  var pending = {}, seq = 0;
  var provider = monaco.languages.registerHoverProvider("twinbasic", {
    provideHover: function (model, position) {
      var node;
      try {
        if (typeof editor === "undefined" || editor.getModel() !== model) return null;
        var lang = model.getLanguageId ? model.getLanguageId() : model.getModeId();
        if (lang !== "twinbasic") return null;
        node = openEditors.selectedEditorNode;
        var ws = lspSocket.webSocket;
        if (!node || !node.fileNode || !ws || !ws.socket || ws.socket.readyState !== 1 || ws.hasErrored) return null;
      } catch (e) {
        return null;
      }
      return new Promise(function (resolve) {
        var n = ++seq;
        var done = function (markdown) {
          if (!pending[n]) return;
          delete pending[n];
          resolve(markdown ? { contents: [{ value: markdown }] } : null);
        };
        pending[n] = done;
        setTimeout(function () { done(""); }, 4000);
        var line = model.getLineContent(position.lineNumber), column = position.column;
        lspSocket.request("textDocument/hover", {
          textDocument: { uri: "twinbasic:" + node.fileNode.getFullPath() },
          position: { line: position.lineNumber - 1, character: position.column - 1 }
        }, function (m) {
          var r = m && m.result;
          var hover = r && r.contents && typeof r.contents.value === "string" ? r.contents.value : "";
          try {
            sink.tbDocsHoverHelp({ kind: "ask", seq: n, line: line, column: column, hover: hover });
          } catch (e) {
            done("");
          }
        });
      });
    }
  });
  var click = function (e) {
    var a = e.target && e.target.closest ? e.target.closest(".monaco-hover a") : null;
    var href = a ? a.getAttribute("data-href") || "" : "";
    if (href.indexOf(site + "/") !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      sink.tbDocsHoverHelp({ kind: "open", path: decodeURIComponent(href.substring(site.length)) });
    } catch (x) {}
  };
  window.addEventListener("click", click, true);
  window.tbDocsHoverHelp = {
    provider: provider,
    click: click,
    pending: pending,
    answer: function (n, markdown) { if (pending[n]) pending[n](markdown); }
  };
}
