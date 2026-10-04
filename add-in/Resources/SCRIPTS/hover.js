var sink = this.parentNode, seq = $SEQ$, done = false;
var answer = function (status, value) {
  if (done) return;
  done = true;
  sink.tbDocsHover({ seq: seq, status: status, value: value || "" });
};
try {
  var node = openEditors.selectedEditorNode, ws = lspSocket.webSocket;
  if (!node || !node.fileNode || !ws || !ws.socket || ws.socket.readyState !== 1 || ws.hasErrored) {
    answer("unavailable");
  } else {
    setTimeout(function () { answer("timeout"); }, 3000);
    lspSocket.request("textDocument/hover", {
      textDocument: { uri: "twinbasic:" + node.fileNode.getFullPath() },
      position: { line: $LINE$, character: $CHAR$ }
    }, function (m) {
      var r = m && m.result;
      answer("ok", r && r.contents && typeof r.contents.value === "string" ? r.contents.value : "");
    });
  }
} catch (e) {
  answer("error", String(e));
}
