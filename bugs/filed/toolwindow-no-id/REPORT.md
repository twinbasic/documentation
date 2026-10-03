Filed as [twinbasic/twinbasic#2449](https://github.com/twinbasic/twinbasic/issues/2449).

## Every tool window given no id is the same window

**Describe the bug**
`Host.ToolWindows.Add` declares its id (`UniqueIdForPositionPersistance`) `Optional`, so leaving it out looks correct. But every tool window added without an id is the same window: the second `Add` returns the window the first one made, after emptying it, and both `ToolWindow` objects are bound to it. An add-in's windows overwrite each other, or another add-in's, and nothing says so.

**To Reproduce**
`toolwindow-no-id` is an add-in project: building it makes a DLL that the IDE's compiler loads on every start until the DLL is removed. Install it knowingly, in an IDE you can restart, and remove it afterwards.

Steps to reproduce the behavior:
1. Open `toolwindow-no-id.twinproj` (attached as `toolwindow-no-id.zip`) and build it for Win32. The DLL is written to `Build\ToolwindowNoId_win32.dll` beside the project file. Close the IDE, copy the DLL into the IDE's `addins\win32` folder (beside `twinBASIC.exe`), and start the IDE again. Open any project: the toolbar has a button, *No id windows*.
2. Click the button. The add-in runs:
   ```
   Set NoId1 = Host.ToolWindows.Add("Window one")
   NoId1.Title = "NO ID 1"
   NoId1.RootDomElement.ChildDomElements.Add("noid1", "div").Properties.innerText = "first"
   NoId1.Visible = True
   Set NoId2 = Host.ToolWindows.Add("Window two")
   NoId2.Title = "NO ID 2"
   NoId2.RootDomElement.ChildDomElements.Add("noid2", "div").Properties.innerText = "second"
   NoId2.Visible = True
   NoId1.RootDomElement.ChildDomElements.Add("noid1again", "div").Properties.innerText = "first again"
   ```
3. One tool window shows, titled `NO ID 2`, holding `noid2` (`second`) and `noid1again` (`first again`). The first window is gone, and what the add-in added through `NoId1` went into the second window.
4. Remove the add-in: close the IDE and delete `addins\win32\ToolwindowNoId_win32.dll`.

**Expected behavior**
Two windows, `NO ID 1` holding `first` and `first again`, and `NO ID 2` holding `second`: each window given no id is a window of its own.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: an add-in's windows overwrite each other, or another add-in's, and nothing says so. The id is declared `Optional`, so leaving it out looks correct. None of the IDE's add-in samples leaves the id out.

What does not reproduce it: a window given an id, or one window given none.

`createToolWindow` in `ide/main.js` files each window under `e.guid`, which is the `UniqueIdForPositionPersistance` argument, and `""` when it is left out. `createToolWindowById(e)` returns the window it already has under that id, after `n.bodyElement.innerHTML=""`, instead of making another, and the page answers the compiler with that window's number, so both `ToolWindow` objects are bound to it. The same reuse is what hands an add-in its own window back after a compiler restart, when it asks again for the id it used before (`test/addin/reload.test.mjs` in this repository's harness), so a fix would give each window without an id one of its own rather than change the reuse.

<!-- Asserted by `addin-test.bat --only panes` (test/addin/panes.test.mjs, "ToolWindows.Add: two windows given no id are one window, emptied by the second Add"), which reads `toolWindowsById` over CDP and finds one window with id "", titled NO ID 2, holding noid2 and noid1again; passes on BETA 995 (observed first on 2026-09-25). The reproducer's add-in is the panes probe's third button (test/addin/probes/panes) alone, with the two windows' names changed. When fixed: update that test, and the ToolWindows page's note on windows without an id (docs/Reference/Built-In/tbIDE/ToolWindows.md). -->
