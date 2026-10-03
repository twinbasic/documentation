Filed as [twinbasic/twinbasic#2447](https://github.com/twinbasic/twinbasic/issues/2447).

## Typing just after a file opens at a position puts the text at that position, in reverse

**Describe the bug**
For 700 ms after the code editor opens a file at a line and column (Go To Definition, a Find in Files result, an add-in's `Editors.Open`), the IDE puts the cursor back at that place whenever the compiler's decorations for the document arrive. Every edit brings new decorations, and each time the cursor goes back the 700 ms start again. So typing that starts inside the window, and goes on without a 0.7 s pause, puts each character at the opened position, in front of the one before it. Typed text goes to the wrong place and in the wrong order, and nothing shows that it happened.

**To Reproduce**
This was measured by a script. By hand it needs typing without a pause of 0.7 s, which is hard to time.

Steps to reproduce the behavior:
1. Open `typing-after-open-reversed.twinproj` (attached as `typing-after-open-reversed.zip`), with `Haystack.twin` not open in an editor tab.
2. Open `Haystack.twin` at line 4, column 9 through `openEditors.openFile(node, false, false, false, 4, 9)`, the call Find in Files makes (`node` is the file's entry in the project tree). By hand: Find in Files for `Dim needleCount` (one match, at line 4, column 9), and double-click the result.
3. 0.3 s later, move the cursor to line 3, column 1, and type `xyz`, one key every 150 ms.
4. Line 3 starts with `x`, and line 4 reads `        zyDim needleCount As Long`.

The cause is in `ide/main.js`: `parseDocumentDecorations` ends with `if(performance.now()-revealedLineTime<700){revealLineInEditor(revealedLine,revealedLineColumn,revealedLineViewPortTop)}`, and `revealLineInEditor` sets the cursor's position and `revealedLineTime` again. Logged in the run above: `revealLineInEditor(4,9)` from `gotFileData`, then from `parseDocumentDecorations` 9 ms later, and again after each key. The same happens for a file that is already open, whose `onReveal` calls `revealLineInEditor` too.

**Expected behavior**
Typing after the file opens puts `xyz` at 3:1, in order. Keeping the view where the reveal left it may be what the repeat is for; setting the cursor again is what does the damage.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 983 (not measured on BETA 995, see below)

**Additional context**
Severity: typed text goes to the wrong place and in the wrong order, and nothing shows that it happened.

What does not reproduce it: the same typing started more than 0.7 s after the file opened, which puts `xyz` at 3:1 in order.

Found by the add-in test harness: `MsgBox(`, typed into the code editor just after opening a file at line 5, came out as `gBox(s` at the start of that line, with the `M` on the line below.

BETA 995 was not measured: no lane exercises it. `parseDocumentDecorations` and `revealLineInEditor` are unchanged in BETA 995's `ide/main.js` (the `revealedLineTime<700` test was read again), and the test harness, which runs on BETA 995, still has to wait out the 700 ms before it places a cursor.

<!-- The harness waits it out with `afterReveal` in scripts/lib/tb-operate.mjs, used by openFile, setCursor and select; the keys and symbols lanes pass on BETA 995 through it. No test asserts the bug itself. The reproducer is the lane's host project (test/addin/host) with header comments; Haystack.twin's first line is a comment, so the line numbers above stay as in the entry. Measured with `openEditors.openFile(node,false,false,false,4,9)` over DevTools. To make it assertable: a lane test in test/addin that opens Haystack.twin at 4:9, types without afterReveal, and reads the text. When fixed: remove the wait from `afterReveal` and its comment. -->
