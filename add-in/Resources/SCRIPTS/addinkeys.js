// Makes add-in shortcuts with {ctrl} or {alt} fire, for every add-in. The
// IDE's key-down handler (globalKeyDown) records a press for its key-up
// dispatcher only when neither Ctrl nor Alt is held, so such a shortcut never
// fires, or fires as the plain key when that was pressed less than 500 ms
// before. This records those presses itself and runs their shortcuts on
// key-up as the IDE runs the others. It is put in only while the IDE has that
// guard, so a build that fixes it is left alone. Running it again replaces
// what an earlier run put in, and puts in nothing when it is turned off.
var on = $ON$;
var old = window.tbDocsAddinKeys;
if (old) {
  window.removeEventListener("keydown", old.down, true);
  window.removeEventListener("keyup", old.up, true);
  window.tbDocsAddinKeys = null;
}
var faulty =
  on &&
  typeof globalKeyDown === "function" &&
  typeof addinKeys === "object" &&
  typeof realKeyPresses === "object" &&
  /\(!\w+\.ctrlKey\|\|\w+\.key==="Control"\)&&\(!\w+\.altKey\|\|\w+\.key==="Alt"\)/.test(String(globalKeyDown));
if (faulty) {
  var presses = {};
  // The key's name as the IDE's key-up handler gives it.
  var keyName = function (e) {
    return e.code.startsWith("Key") ? e.code.substr(3) : e.key;
  };
  var down = function (e) {
    if (e.key === "Control" || e.key === "Alt" || !(e.ctrlKey || e.altKey)) return;
    // AltGr types a character, as a plain key does.
    if (e.getModifierState && e.getModifierState("AltGraph")) return;
    presses[keyName(e)] = { at: performance.now(), ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey };
  };
  var up = function (e) {
    var o = keyName(e);
    var p = presses[o];
    if (!p) return;
    delete presses[o];
    // The IDE's record of this key is from an earlier press without Ctrl or
    // Alt; left, it would run this key-up as that key.
    delete realKeyPresses[o];
    if (modalDialogs.length || isRenameWidgetActive) return;
    if (performance.now() - p.at >= 500) return;
    var shortcut = (p.ctrl ? "{ctrl}" : "") + (p.shift ? "{shift}" : "") + (p.alt ? "{alt}" : "") + o.toLowerCase();
    var handlers = addinKeys[shortcut];
    if (handlers) {
      handlers.forEach(function (h) {
        try {
          h();
        } catch (err) {
          console.error(err);
        }
      });
    }
  };
  window.addEventListener("keydown", down, true);
  window.addEventListener("keyup", up, true);
  window.tbDocsAddinKeys = { down: down, up: up };
}
