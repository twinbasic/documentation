Filed as [twinbasic/twinbasic#2526](https://github.com/twinbasic/twinbasic/issues/2526).

## Two themes that inherit from each other freeze the IDE, and choosing one fails with a stack overflow

**Describe the bug**
When two theme files name each other in their `inherits:` lines, loading the themes stops the IDE's page for several seconds and leaves the themes half linked: one of the two is listed as `<name> (undefined)`. Choosing either of them afterwards changes nothing on screen: the page raises an uncaught `RangeError: Maximum call stack size exceeded` while it applies the theme, and the previous theme's colours stay. Nothing on screen reports the error. It was observed in an IDE started with an `APPDATA` of its own, with a timer in the IDE's page recording the longest time the page did not run, and a listener for the page's `error` event catching the exception.

**To Reproduce**
Steps to reproduce the behavior:
1. Start the IDE. There is no project to open. In `%APPDATA%\twinBASIC\themes`, write `LoopA.theme`:
   ```
   inherits: LoopB;
   MenuBackColor: rgb(1, 1, 1);
   ```
   and `LoopB.theme`:
   ```
   inherits: LoopA;
   MenuBackColor: rgb(2, 2, 2);
   ```
2. Choose Window > Theme > Reload from disk. The IDE does not respond for about seven seconds (7.5 s on the machine it was found on).
3. Open Window > Theme: it lists `LoopB (undefined)`.
4. Choose `LoopA`: the menu bar does not take `rgb(1, 1, 1)`, and nothing else changes.
5. To recover, remove the loop from the files and restart the IDE.

**Expected behavior**
The IDE stays responsive, and the themes in the loop fall back to the Dark theme, which the code in `addTheme` means them to do: it checks for a theme met twice, and sets the group to Dark when it finds one. Choosing `LoopA` then applies at least its own `MenuBackColor`. A message naming the loop would help the person who wrote it.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The cause, read from `ide\main.js`: in `addTheme`, the pass that gives each theme its group follows `inheritsFromLink` in a `while` loop and records each theme it passes. When it meets a theme a second time it sets the group to Dark, but does not leave the loop, so it keeps going round the two themes until it stops after several seconds without finishing: `LoopB` is never given a group, and `afterRefreshedThemes` is still pending afterwards. `applyThemeData` then follows the same links recursively when a theme of the loop is applied, and overflows the stack. A `break` after the fall-back, and the same check in `applyThemeData`, would cure both.

Start-up loads the themes through the same `reloadThemesFromDisk`, so an IDE started with the two files in place should freeze the same way; only Reload from disk was tried. A longer chain that returns to its first theme takes the same path in the code, and was not tried.

Severity: moderate. Nothing is lost and the IDE recovers, but the freeze looks like a hang, and nothing says which files cause it.

<!-- Reproducer: bugs/theme-inherit-loop/ (mode lane: asserted by `ide-test.bat --only customising` (test/ide/customising.test.mjs), the test "two themes that inherit each other freeze the page, and choosing one fails with a stack overflow", which passes on BETA 1005 with a pause of 7.5 s; it asserts a pause of at least 2 s, LoopB listed as (undefined), LoopA's colour not applied and the RangeError). No project and no zip. docs/IDE/Customising/Themes.md carries a WARNING for it, the second of its two; when a fixed build is released, that WARNING goes. Found 2026-10-11 in the trials for the Customising pages; the fact sheet had expected the fall-back to Dark. -->
