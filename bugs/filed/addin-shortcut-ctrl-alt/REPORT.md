Filed as [twinbasic/twinbasic#2445](https://github.com/twinbasic/twinbasic/issues/2445).

## An add-in's keyboard shortcut does not fire if it includes `{CTRL}` or `{ALT}`

**Describe the bug**
A shortcut an add-in registers with `Host.KeyboardShortcuts.Add` does not fire when its key string includes `{CTRL}` or `{ALT}`. The SDK's own example, `{CTRL}{SHIFT}d` in the description of `KeyboardShortcuts.Add`, cannot be used, and nothing says why. An add-in that registers

```
Host.KeyboardShortcuts.Add "{CTRL}{SHIFT}d", AddressOf OnCtrlShiftD
Host.KeyboardShortcuts.Add "{SHIFT}d", AddressOf OnShiftD
```

gets `OnShiftD` for Shift+D, and nothing at all for Ctrl+Shift+D.

**To Reproduce**
`addin-shortcut-ctrl-alt` is an add-in project: building it makes a DLL that the IDE's compiler loads on every start until the DLL is removed. Install it knowingly, in an IDE you can restart, and remove it afterwards.

Steps to reproduce the behavior:
1. Open `addin-shortcut-ctrl-alt.twinproj` (attached as `addin-shortcut-ctrl-alt.zip`) and build it for Win32. The DLL is written to `Build\AddinShortcutCtrlAlt_win32.dll` beside the project file. Close the IDE, copy the DLL into the IDE's `addins\win32` folder (beside `twinBASIC.exe`), and start the IDE again. Open any project: the Debug Console shows `[KeysProbe] registered`. The add-in registers eight key strings and prints `[KeysProbe] fired <key string>` when one fires:
   ```
   .Add "{CTRL}{SHIFT}d", AddressOf CtrlShiftD
   .Add "{ctrl}d", AddressOf CtrlD
   .Add "{ALT}f", AddressOf AltF
   .Add "{SHIFT}D", AddressOf ShiftD
   .Add "d", AddressOf PlainD
   .Add "F1", AddressOf F1
   .Add "{shift}f1", AddressOf ShiftF1
   .Add "q", AddressOf PlainQ
   ```
2. With no text box focused (click an empty part of the toolbar), press D, Shift+D, F1 and Shift+F1, a second apart. Each prints a `fired` line: `d`, `{shift}d`, `f1`, `{shift}f1`.
3. Press Ctrl+Shift+D, Ctrl+D and Alt+F, a second apart. Nothing is printed for any of them.
4. Press D, then within half a second Ctrl+D and Ctrl+Shift+D; then F, and within half a second Alt+F. Now all of them print.
5. Remove the add-in: close the IDE and delete `addins\win32\AddinShortcutCtrlAlt_win32.dll`.

| registered | pressed | fires |
|---|---|---|
| `d`, `{SHIFT}D`, `F1`, `{shift}f1` | D, Shift+D, F1, Shift+F1 | yes |
| `{CTRL}{SHIFT}d`, `{ctrl}d`, `{ALT}f` | Ctrl+Shift+D, Ctrl+D, Alt+F, each more than 0.5 s after any other press of D or F | **no** |
| the same three | D alone, then Ctrl+D and Ctrl+Shift+D; F alone, then Alt+F, all inside 0.5 s | yes, all three |

**Expected behavior**
Each registered shortcut fires when its keys are pressed, whatever modifiers it names. The SDK's example, `{CTRL}{SHIFT}d`, works.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: the SDK's own example cannot be used, and nothing says why.

The last row of the table shows the cause. `globalKeyUp` in `ide/main.js` matches an add-in's shortcut when the key is released, and only if `realKeyPresses` holds a press of the same key from less than 500 ms before. `globalKeyDown` records a press only `if((!e.ctrlKey||e.key==="Control")&&(!e.altKey||e.key==="Alt"))`, so a key pressed with Ctrl or Alt held is never recorded. Its release finds either no press, or an earlier one of the same key made without the modifier. The IDE's own bindings are unaffected, because they are matched on the key-down.

A smaller point for the same fix: `KeyboardShortcuts.Add` stores the string as given, lowercased and without spaces, and the key-up builds the string it looks up as `{ctrl}`, `{shift}`, `{alt}` and the key, in that order. So `{SHIFT}{CTRL}d` could never match even with the recording fixed.

<!-- Asserted by `addin-test.bat --only keys` (test/addin/keys.test.mjs: "P1: plain, Shift and function keys fire", "P1: Ctrl and Alt keys do not fire", "P1: a Ctrl or Alt key fires when the same key was pressed alone just before"), which presses keys as CDP key events and passes on BETA 995 (observed first on 2026-09-24). The reproducer's add-in is test/addin/probes/keys with a new project name and header comment; its DLL name differs, and nothing else. When fixed: update P1 in WIP.HelpAddin.md, the NOTE on docs/Reference/Built-In/tbIDE/KeyboardShortcuts.md, and that test. -->
