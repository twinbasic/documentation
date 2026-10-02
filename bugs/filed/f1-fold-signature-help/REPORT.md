Filed as [twinbasic/twinbasic#2446](https://github.com/twinbasic/twinbasic/issues/2446).

## F1 and the fold icon toggle the signature help, then fail

**Describe the bug**
In the code editor's signature help, F1 and a click on the fold icon both toggle the help between expanded and collapsed, and then fail. Every F1 adds `command failed: "tbHelp_ToggleExpandSignatureHelp"` to the Debug Console, and every click on the icon throws an error in the page. The toggle works, so the error is the only symptom.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `f1-fold-signature-help.twinproj` (attached as `f1-fold-signature-help.zip`) and open `Main.twin`. Put the cursor inside the parentheses of the call `FindTheNeedle(3)` and press Ctrl+Space. The signature help shows, with a fold icon whose tooltip reads *Fold/Collapse (F1)*.
2. Press F1. The signature help expands, and the Debug Console shows `command failed: "tbHelp_ToggleExpandSignatureHelp"`. F1 again collapses it, with a second such line.
3. Click the fold icon instead. The signature help toggles, and the page throws `TypeError: Cannot read properties of undefined (reading 'stopPropagation') at toggleSigHelp`.

**Expected behavior**
The toggle, and no error.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: cosmetic. The toggle works, but every F1 adds the failure line to the Debug Console, and every click on the icon throws in the page.

`toggleSigHelp(e)` in `ide/main.js` ends with `e.stopPropagation();e.preventDefault()`, and neither caller passes an event: the command is `internalAction:()=>{toggleSigHelp()}`, and the icon is `onclick='toggleSigHelp()'`. The toggle comes first, so the error is the only symptom. `executeKeyboardShortcuts` catches the command's error and writes the Debug Console line.

F1 was measured on BETA 995, in a run where an add-in that registers F1 was loaded (it only shows that the shortcut fires; the IDE's own command is the one that fails). The click on the icon was measured on BETA 983, in a harness IDE with the page's exceptions recorded over CDP; `toggleSigHelp` and both callers are unchanged in BETA 995's `ide/main.js`.

<!-- Asserted by `addin-test.bat --only keys` (test/addin/keys.test.mjs, "P2: F1 while signature help shows toggles it, the IDE reports a failure, and the add-in fires"), which checks for the failure line; passes on BETA 995. The reproducer is the lane's host project (test/addin/host) with header comments, with no add-in, so the F1 step is the lane's minus the add-in's shortcut: not run without it. First observed on 2026-09-24. When fixed: update P2 in WIP.HelpAddin.md and that test. -->
