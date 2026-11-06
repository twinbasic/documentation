// Fix for save-overtakes-breakpoint-change: the save goes to the compiler after the timer that
// sends F9's change, where it went before that timer when Ctrl+S came straight after F9.
// Written on BETA 1034; the local names are ours (scripts/ide-js/names.json), not twinBASIC's.
// Applied with `node scripts/ide_js.mjs patch bugs/save-overtakes-breakpoint-change/fix.js --copy-to <dir>`.
function serverSaveDirtyDocuments(done) {
  var errorCount = 0;
  var pending = 1;
  var lastProgress = performance.now();
  var oneDone = () => {
    lastProgress = performance.now();
    pending--;
    if (pending == 0) {
      if (watchdog) {
        clearInterval(watchdog);
        watchdog = 0;
      }
      // On a timer of its own: a breakpoint change made just before the save is waiting on a
      // timer to be sent, so this one runs after it.
      if (done) setTimeout(done, 0);
    }
  };
  for (let tabIndex = 0; tabIndex < codePanelTabs.childNodes.length; tabIndex++) {
    try {
      var editorNode = codePanelTabs.childNodes[tabIndex].editorNode;
      if (editorNode) {
        if (openEditors.isDirtyEditor(editorNode)) {
          if (editorNode.fileHandler && editorNode.fileHandler.save) {
            pending++;
            editorNode.fileHandler.save(editorNode, oneDone);
          }
        }
      }
    } catch (error) {
      errorCount++;
      debugOutputLine(
        "[ERROR] saving open document " + codePanelTabs.childNodes[tabIndex].innerText,
        "debugConsoleOutputTextALERT",
      );
    }
  }
  var watchdog = setInterval(() => {
    if (pending > 0) {
      var elapsed = performance.now() - lastProgress;
      if (elapsed > 1e4) {
        if (watchdog) {
          clearInterval(watchdog);
          watchdog = 0;
        }
        var timeoutMessage = createDOMElement(
          undefined,
          "div",
          "simpleMsgBox margin7",
          "The IDE timed out while trying to save the currently open documents.\r\n\r\nThe project-save operation will try to continue, but you should then manually\r\nmake backups of any recently edited documents so that you don't lose changes.",
        );
        showModalDialog(timeoutMessage, [
          {
            caption: "{%DialogCaptionOKButton}",
            onclick: () => {
              hideModalDialog();
              while (pending > 0) {
                oneDone();
              }
            },
            isDefaultAcceptAction: true,
            isDefaultCancelAction: false,
          },
        ]);
      }
    }
  }, 1e3);
  if (errorCount != 0) {
    if (watchdog) {
      clearInterval(watchdog);
      watchdog = 0;
    }
    var message = createDOMElement(
      undefined,
      "div",
      "simpleMsgBox margin7",
      errorCount +
        " errors occured when trying to save changes of the open documents in the IDE.\r\n\r\nThe project-save operation will try to continue, but you should then manually\r\nmake backups of any recently edited documents so that you don't lose changes.\r\n\r\nCheck the DEBUG CONSOLE for details.",
    );
    showModalDialog(message, [
      {
        caption: "{%DialogCaptionOKButton}",
        onclick: () => {
          hideModalDialog();
          while (pending > 0) {
            oneDone();
          }
        },
        isDefaultAcceptAction: true,
        isDefaultCancelAction: false,
      },
    ]);
  } else {
    oneDone();
  }
}
