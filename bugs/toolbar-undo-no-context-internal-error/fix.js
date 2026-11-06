// Fix for toolbar-undo-no-context-internal-error: a button bound to a list of commands has no
// command to run until one of them has applied, so a press before that does nothing, where it
// passed the list itself to executeIdeCommand as a command id.
// Written on BETA 1034; the local names are ours (scripts/ide-js/names.json), not twinBASIC's.
// Applied with `node scripts/ide_js.mjs patch bugs/toolbar-undo-no-context-internal-error/fix.js --copy-to <dir>`.
function bindIconToIdeCommand(button, command, noClick) {
  if (button.boundCommand) return;
  boundCommandIcons.push(button);
  button.unalteredTitle = button.title;
  button.boundCommand = command;
  button.onmouseenter = (enterEvent) => {
    statusHoveringCommand.innerText = Array.isArray(command) ? command.join(" / ") : command;
  };
  button.onmouseleave = (leaveEvent) => {
    statusHoveringCommand.innerText = "";
  };
  registerContextBindings(button);
  let keys = GetIdeCommandShortcutDescription(command);
  if (keys) {
    button.title += " (" + keys + ")";
  }
  if (!noClick) {
    button.onmousedown = (pressEvent) => {
      pressEvent.preventDefault();
      if (pressEvent.button === 0) {
        const target = button.contextAwareBoundCommand ? button.contextAwareBoundCommand : command;
        // A list means that no command of the list has applied yet.
        if (!Array.isArray(target)) executeIdeCommand(target, true);
      }
    };
  }
}
