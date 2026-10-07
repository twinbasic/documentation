Filed as [twinbasic/twinbasic#2479](https://github.com/twinbasic/twinbasic/issues/2479).

## `raiseEvent` in a tool window's own HTML throws a TypeError, and the add-in's listener is not called

**Describe the bug**
An add-in sets a tool window's HTML with an inline handler that calls `raiseEvent`, as the list-view items of Sample 15 do, and registers a listener for the event with `AddEventListener` on the parent element. Clicking the element does not call the listener, and the add-in is told nothing. The IDE's page throws `TypeError: Cannot read properties of null (reading 'rootEventHandler')`: `raiseEvent` goes up through `parentNode` looking for an element that has `rootEventHandler`, and in plain tool-window HTML no element has one, so it goes past the document.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `raiseevent-plain-html-typeerror.twinproj` (attached as `raiseevent-plain-html-typeerror.zip`). It is an add-in, and its tool window is built like this:
   ```
   With Pane.RootDomElement.ChildDomElements.Add("box", "div")
       .AddEventListener("myEvent", AddressOf MyEvent)
       .Properties.innerHTML = _
           "<span id='raise' onclick='raiseEvent(""myEvent"", event, true, ""a"")'>[raise]</span> " & _
           "<span id='direct' onclick='this.parentNode.myEvent(event)'>[direct]</span>"
   End With
   ```
   `MyEvent` prints `myEvent from <id of the element clicked>` to the DEBUG CONSOLE.
2. Build it (win32). Copy `Build\RaiseeventPlainHtmlTypeerror_win32.dll` into `%APPDATA%\twinBASIC\addins\win32\`, restart the IDE and open any project.
3. Click the toolbar button **raiseEvent repro**. A tool window opens with **[raise]** and **[direct]**.
4. Click **[raise]**. Nothing is printed, and the IDE's page has the uncaught `TypeError` above.
5. Click **[direct]**. The DEBUG CONSOLE prints `myEvent from direct`.

**Expected behavior**
Step 4 prints `myEvent from raise`: `raiseEvent` calls the listener the div registered, as calling it directly does in step 5. If `raiseEvent` is meant only for list views and Monaco widgets, it stops at the document without throwing.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Also on BETA 995.

The workaround is step 5's: an inline handler that calls the function `AddEventListener` stores on the element under the event's name.

Severity: low. A workaround exists, but nothing tells the add-in's author why the listener is not called: the exception shows only in the IDE's own page.

<!-- Reproducer: bugs/raiseevent-plain-html-typeerror/ (mode lane: an add-in has to be built into an IDE's add-in folder, which nothing here may do outside a lane, so `verify` runs the lane). Asserted by `addin-test.bat --only panes` (test/addin/panes.test.mjs, "P12: raiseEvent from plain tool-window HTML throws, and the add-in hears nothing", and the direct call after it), which passes on BETA 995 and 997. The reproducer is a cut-down copy of that lane's PanesProbe add-in (test/addin/probes/panes), compiled clean on 997 by `bug_repro.mjs compile`, and not itself run in a lane. The raiseEvent source quoted is from BETA 997's ide/main.js. Stated in docs/Reference/Built-In/tbIDE/HtmlElement.md, the NOTE under "raiseEvent" (names BETA 997), and in WIP.HelpAddin.md (P12): when fixed, update that test and P12, and state in the NOTE what raiseEvent does in plain HTML, with no mention of the defect. -->
