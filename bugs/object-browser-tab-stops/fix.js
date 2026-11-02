// Fix for object-browser-tab-stops: in a modal dialog, Tab and Shift+Tab move the focus
// through the dialog's own controls while one of them has it, instead of moving the
// highlight of the footer buttons and leaving the focus where it was. Written on BETA 1034;
// the local names are ours (scripts/ide-js/names.json), not twinBASIC's. Applied with
// `node scripts/ide_js.mjs patch bugs/object-browser-tab-stops/fix.js --copy-to <dir>`.
function showModalDialog(content, buttons, caption, onClose, keepUnlocked, noButtonKeys) {
  let container = document.createElement("div");
  container.className = "modalDialogContainer";
  container.style.display = "none";
  bodyInner.appendChild(container);
  var previous = modalDialogs.length ? modalDialogs[modalDialogs.length - 1] : undefined;
  if (previous) {
    if (previous.canBeAutoClosed) {
      hideModalDialog();
    } else {
      previous.style.pointerEvents = "none";
    }
  }
  modalDialogs.push(container);
  if (modalDialogs.length == 1) lockUI("showing modal dialog1", 0, undefined);
  if (keepUnlocked) alert("dont lock ui?");
  container.innerHTML = "";
  var startLeft;
  var startTop;
  var startX;
  var startY;
  var dragging;
  var titleBar = document.createElement("div");
  titleBar.className = "modalTitleBar";
  titleBar.innerText = caption ? evaluateLocalizedString(caption) : "twinBASIC";
  titleBar.onpointerdown = (down) => {
    startLeft = container.offsetLeft;
    startTop = container.offsetTop;
    startX = down.clientX;
    startY = down.clientY;
    titleBar.setPointerCapture(down.pointerId);
    dragging = true;
  };
  titleBar.onmousemove = (move) => {
    if (dragging) {
      var dx = move.clientX - startX;
      var dy = move.clientY - startY;
      container.style.left = startLeft + dx + "px";
      container.style.top = startTop + dy + "px";
      webpagePanel.checkObscured();
    }
  };
  titleBar.onpointerup = (up) => {
    dragging = false;
  };
  container.appendChild(titleBar);
  if (onClose) {
    var closeBox = document.createElement("div");
    closeBox.className = "modalTitleBarCloseBtn codicon codicon-close";
    closeBox.onpointerdown = (press) => {
      press.stopPropagation();
    };
    closeBox.onmouseup = () => {
      debugger;
      onClose();
    };
    closeBox.title = "Close";
    titleBar.appendChild(closeBox);
  }
  container.canBeAutoClosed = content.canBeAutoClosed;
  container.appendChild(content);
  container.style.display = "block";
  container.tabIndex = 0;
  container.escapeButton = undefined;
  var cancelButton = undefined;
  var acceptButton = undefined;
  var focusedButton = undefined;
  var firstButton = undefined;
  var lastButton = undefined;
  container.onkeydown = (event) => {
    if (event.key === "Escape") {
      if (cancelButton) {
        const inTextBox = document.activeElement
          ? document.activeElement.tagName === "INPUT" ||
            document.activeElement.tagName === "TEXTAREA"
          : false;
        if (inTextBox) {
          container.focus();
        } else if (cancelButton.onclick) {
          cancelButton.onclick();
        } else if (cancelButton.domObject.click) {
          cancelButton.domObject.click();
        }
      }
    }
    if (event.key === "Enter") {
      if (focusedButton) {
        if (focusedButton.onclick) {
          focusedButton.onclick();
        } else if (focusedButton.domObject.click) {
          focusedButton.domObject.click();
        }
      }
    }
    if (!noButtonKeys) {
      // Tab and Shift+Tab move the focus through the dialog's own controls while one of them
      // has it, wrapping at the ends, where a dialog that does so itself has done it already.
      if (event.key === "Tab" && container.contains(document.activeElement) && document.activeElement !== container) {
        if (!event.defaultPrevented) {
          const controls = [...container.querySelectorAll("button, input, select, textarea, [tabindex]")].filter(
            (control) => control.tabIndex >= 0 && !control.disabled && control.getClientRects().length,
          );
          const current = controls.indexOf(document.activeElement);
          const step = event.shiftKey ? controls.length - 1 : 1;
          if (controls.length) controls[current < 0 ? 0 : (current + step) % controls.length].focus();
          event.preventDefault();
        }
        event.stopPropagation();
        return;
      }
      if ((event.key === "Tab" && !event.shiftKey) || event.key === "ArrowRight") {
        if (
          document.activeElement.localName == "input" ||
          document.activeElement.localName == "textarea"
        )
          return;
        if (focusedButton) {
          focusedButton.domObject.classList.remove("buttonFocused");
          focusedButton = focusedButton.nextButton;
        }
        if (!focusedButton) focusedButton = firstButton;
        if (focusedButton) {
          focusedButton.domObject.classList.add("buttonFocused");
        }
        event.preventDefault();
        event.stopPropagation();
      }
      if ((event.key === "Tab" && event.shiftKey) || event.key === "ArrowLeft") {
        if (
          document.activeElement.localName == "input" ||
          document.activeElement.localName == "textarea"
        )
          return;
        if (focusedButton) {
          focusedButton.domObject.classList.remove("buttonFocused");
          focusedButton = focusedButton.prevButton;
        }
        if (!focusedButton) focusedButton = lastButton;
        if (focusedButton) {
          focusedButton.domObject.classList.add("buttonFocused");
        }
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };
  if (buttons) {
    var buttonBar = createDOMElement(container, "div", "msgBoxButtons");
    var leadingSpacer = createDOMElement(buttonBar, "div", "");
    var hasSpacer = false;
    var lastButton = undefined;
    buttons.forEach((button) => {
      if (!button.hidden) {
        if (button.caption) {
          var element = createDOMElement(
            buttonBar,
            "div",
            "msgBoxButton",
            evaluateLocalizedString(button.caption),
          );
          if (button.id) element.id = button.id;
          element.onclick = (click) => {
            if (click.button === 0 && button.onclick) button.onclick();
          };
          if (!noButtonKeys) {
            element.onmousedown = (mouseDown) => {
              if (focusedButton) {
                focusedButton.domObject.classList.remove("buttonFocused");
                focusedButton = button;
                focusedButton.domObject.classList.add("buttonFocused");
              }
            };
            button.domObject = element;
            if (lastButton) lastButton.nextButton = button;
            button.prevButton = lastButton;
            lastButton = button;
            if (!firstButton) firstButton = button;
            lastButton = button;
          }
          if (button.width) {
            element.style.minWidth = button.width * generalScaling + "px";
          }
          if (button.isDefaultCancelAction) {
            cancelButton = button;
          }
          if (button.isDefaultAcceptAction) {
            acceptButton = button;
            if (!noButtonKeys) {
              element.classList.add("buttonFocused");
              focusedButton = button;
            }
          }
        } else {
          createDOMElement(buttonBar, "div", "msgBoxButtonSpacer");
          hasSpacer = true;
        }
      }
    });
    if (!hasSpacer) {
      leadingSpacer.classList = "msgBoxButtonSpacer";
    }
    container.focus();
    container.escapeButton = cancelButton;
  }
  RepositionModalDialog(container);
}
