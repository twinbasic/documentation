// Fix for f9-after-edit-loses-glyph: the answer to a change, and the answer to getDecorations,
// replace the margin's breakpoints only when the compiler had been sent every change the page
// has made, so a list made before the last F9 no longer erases the glyph that F9 drew.
// Written on BETA 1034; the local names are ours (scripts/ide-js/names.json), not twinBASIC's.
// Applied with `node scripts/ide_js.mjs patch bugs/f9-after-edit-loses-glyph/fix.js --copy-to <dir>`.
function toggleBreakpointAtLine(line) {
  if (codePanelMainInnerMonacoContainer.classList.contains("hide")) return;
  if (line === undefined) {
    line = editor.getPosition().lineNumber;
  }
  var model = editor.getModel();
  var foundIndex = undefined;
  var index = 0;
  currentBreakpointDecorations.forEach((decoration) => {
    if (model.getDecorationRange(decoration).startLineNumber === line) {
      foundIndex = index;
    }
    index++;
  });
  if (foundIndex !== undefined) {
    var removed = currentBreakpointDecorations.splice(foundIndex, 1);
    deltaDecorationsSafe(editor, removed, []);
  } else {
    currentBreakpointDecorations.push(
      deltaDecorationsSafe(
        editor,
        [],
        [
          {
            range: new monaco.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              glyphMarginClassName: "marginGlyph breakpointActiveGlyph",
            },
          },
        ],
      ),
    );
  }
  var versionInfo = { versionId: editor.getModel().getVersionId() };
  // Counted here, before the change is sent: an answer that arrives from now on, until the
  // compiler has this change, holds a list that is out of date.
  var fileNode = openEditors.selectedEditorNode.fileNode;
  fileNode.breakpointChanges = (fileNode.breakpointChanges || 0) + 1;
  model.ourChangeContentHandler(versionInfo, true, true);
}

function sendDocumentChangeToServer(editorNode, change, onAnswer) {
  if (editorNode.fileNode.pendingChangeConfirmation) {
    if (editorNode.fileNode.queuedChange) {
    }
    editorNode.fileNode.queuedChange = change;
  } else {
    editorNode.fileNode.pendingChangeConfirmation = true;
    // The compiler answers this change with the breakpoints it has been sent up to now.
    if (change.contentChanges === null) {
      editorNode.fileNode.breakpointChangesSent = editorNode.fileNode.breakpointChanges;
    }
    const breakpointChangesAnswered = editorNode.fileNode.breakpointChangesSent;
    lspSocket.request("textDocument/didChangeV2", change, (answer) => {
      if (onAnswer) {
        onAnswer();
        return;
      }
      editorNode.fileNode.pendingChangeConfirmation = false;
      if (editorNode.fileNode.queuedChange) {
        let queued = editorNode.fileNode.queuedChange;
        editorNode.fileNode.queuedChange = undefined;
        sendDocumentChangeToServer(editorNode, queued);
      } else {
        if (change.contentChanges !== null) {
          nextScopeUpdateIsAnEdit = true;
          parseDocumentDecorations(
            editorNode,
            answer.result,
            editorNode.fileNode.ideVersionId,
            breakpointChangesAnswered,
          );
        }
      }
    });
  }
}

function getSemanticTokensForCurrentFile() {
  currentDocumentSemanticTokens = undefined;
  cachedFoldingRangesRaw = undefined;
  var editorNode = openEditors.selectedEditorNode;
  if (!editorNode) return;
  if (!editorNode.fileNode) return;
  if (!editorNode.fileNode.getFullPath) return;
  var uri = "twinbasic:" + editorNode.fileNode.getFullPath();
  traceOutputLine(
    "getSemanticTokensForCurrentFile: " + uri + " [v" + editorNode.fileNode.ideVersionId + "]",
  );
  awaitingDocumentDecorations = true;
  const breakpointChangesAnswered = editorNode.fileNode.breakpointChangesSent;
  lspSocket.request(
    "textDocument/getDecorations",
    { textDocument: { uri: uri, version: editorNode.fileNode.ideVersionId } },
    (answer) => {
      parseDocumentDecorations(editorNode, answer.result, 0, breakpointChangesAnswered);
      traceOutputLine("getSemanticTokensForCurrentFile... " + uri + " [done]");
    },
  );
}

function parseDocumentDecorations(editorNode, decorations, versionId, breakpointChangesAnswered) {
  if (!monaco) return;
  traceOutputLine("parseDocumentDecorations: " + editorNode.fileNode.getFullPath());
  if (!decorations) return;
  if (openEditors.selectedEditorNode !== editorNode) return;
  if (versionId) {
    if (versionId !== editorNode.fileNode.ideVersionId) {
      return;
    }
  }
  currentDocumentSemanticTokens = {};
  applyCurrentDocumentSemanticTokens(decorations.semanticTokens);
  currentDocumentSemanticTokensEditorNode = editorNode;
  currentDocumentExtraInfoDecorations = decorations.extraDecorations;
  let tokensTime = performance.now();
  syncVisibleSemanticTokens();
  var separatorDecorations = [];
  currentDocumentRawLineSeperators = decorations.lineSeperators;
  const separators = decorations.lineSeperators;
  separators.forEach((separator) => {
    separatorDecorations.push({
      range: new monaco.Range(separator, 1, separator, 1),
      options: { isWholeLine: true, className: "procSplitterBar" },
    });
  });
  let separatorsTime = performance.now();
  clearAllWidgets();
  const codeLenses = decorations.codeLens;
  codeLenses.forEach((lens) => {
    addCodeLens(
      lens.range.start.line + 1,
      lens.range.start.character + 1,
      lens.command.title,
      lens.command.command,
      lens.command.arguments,
    );
  });
  addCodeLensFinalize();
  // A list made before the page's last breakpoint change is out of date: the page's stands.
  const breakpoints =
    breakpointChangesAnswered === editorNode.fileNode.breakpointChanges
      ? decorations.breakpoints
      : currentBreakpointDecorations.map((id) => ({
          line: editorNode.monacoModelInstance.getDecorationRange(id).startLineNumber,
        }));
  clearCurrentEditorBreakpoints();
  currentBreakpointDecorations = [];
  var breakpointLines = [];
  breakpoints.forEach((breakpoint) => {
    currentBreakpointDecorations.push(
      deltaDecorationsSafe(
        editor,
        [],
        [
          {
            range: new monaco.Range(breakpoint.line, 1, breakpoint.line, 1),
            options: { glyphMarginClassName: "marginGlyph breakpointActiveGlyph" },
          },
        ],
      ),
    );
    breakpointLines.push(breakpoint.line);
  });
  resyncBookmarks(editorNode.fileNode.getFullPath());
  if (openEditors.selectedEditorNode.monacoModelInstance)
    openEditors.selectedEditorNode.monacoModelInstance.cachedBreakpointLines = breakpointLines;
  outlinePanel.syncSymbols(decorations.symbols);
  codeComboSelectors.syncScopes(decorations.scopes);
  lastEditorDecorations_LineSeperators = deltaDecorationsSafe(
    editor,
    lastEditorDecorations_LineSeperators,
    separatorDecorations,
  );
  awaitingDocumentDecorations = false;
  var action = awaitingDocumentDecorations_action;
  awaitingDocumentDecorations_action = undefined;
  if (action) action();
  if (performance.now() - revealedLineTime < 700) {
    revealLineInEditor(revealedLine, revealedLineColumn, revealedLineViewPortTop);
  }
}
