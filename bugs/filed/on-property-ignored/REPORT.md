Filed as [twinbasic/twinbasic#2478](https://github.com/twinbasic/twinbasic/issues/2478).

## Setting a property whose name starts with `on` through `HtmlElementProperties` does nothing, and raises no error

**Describe the bug**
An add-in that sets an event-handler property of a tool-window element through `HtmlElementProperties`, such as `.Properties.onclick = "..."`, gets no error, and the element has no handler: a click does nothing, and the element has neither an `onclick` property nor an `onclick` attribute. The same handler written inline in `innerHTML` runs. The IDE page's property setter skips any property whose last name starts with `on`, with an empty branch (`if(a.indexOf("on")==0){}`), and reports success.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `on-property-ignored.twinproj` (attached as `on-property-ignored.zip`). It is an add-in, and its tool window is built like this:
   ```
   With .Add("property", "div")
       .Properties.innerText = "[property]"
       On Error Resume Next
       .Properties.onclick = "this.innerText = 'clicked'"
       Host.DebugConsole.PrintText "onclick set, error " & Err.Number
       On Error GoTo 0
   End With
   With .Add("inline", "div")
       .Properties.innerHTML = "<span onclick=""this.innerText = 'clicked'"">[inline]</span>"
   End With
   ```
2. Build it (win32). Copy `Build\OnPropertyIgnored_win32.dll` into `%APPDATA%\twinBASIC\addins\win32\`, restart the IDE and open any project.
3. Click the toolbar button **on property repro**. A tool window opens with **[property]** and **[inline]**, and the DEBUG CONSOLE prints `onclick set, error 0`.
4. Click **[property]**. Nothing happens.
5. Click **[inline]**. Its text changes to `clicked`.

**Expected behavior**
Either the property is set, as every other property is, and step 4 changes the text; or, if handler properties are refused on purpose, the assignment raises an error that says so, and step 3 prints a nonzero error.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Also on BETA 995.

Only `onclick` was tried. The setter's test is on the name, so it applies to every name that starts with `on`.

Severity: low. `AddEventListener` and inline handlers work, but an add-in that sets a handler property gets neither the handler nor an error.

<!-- Reproducer: bugs/on-property-ignored/ (mode lane: an add-in has to be built into an IDE's add-in folder, which nothing here may do outside a lane, so `verify` runs the lane). Asserted by `addin-test.bat --only panes` (test/addin/panes.test.mjs, 'P4: a property whose name starts with "on" is dropped, and the add-in is told nothing'), which passes on BETA 995 and 997. The reproducer is a cut-down copy of that lane's PanesProbe add-in (test/addin/probes/panes), compiled clean on 997 by `bug_repro.mjs compile`, and not itself run in a lane. The setter source quoted is from BETA 997's ide/main.js. Stated in docs/Reference/Built-In/tbIDE/HtmlElementProperties.md, the NOTE that begins "A property whose name starts with `on` is ignored" (names BETA 997), and in WIP.HelpAddin.md (P4): when fixed, update that test and P4, and remove the NOTE or replace it with what the setter now does. -->
