Filed as [twinbasic/twinbasic#2527](https://github.com/twinbasic/twinbasic/issues/2527).

## A `Dark.theme` or `Light.theme` in `%APPDATA%\twinBASIC\themes` stops every custom theme from inheriting, and Reload from disk from applying the theme

**Describe the bug**
When the common themes folder, `%APPDATA%\twinBASIC\themes`, holds a file named `Dark.theme` or `Light.theme`, no custom theme is linked to the theme it inherits from. Window > Theme lists every custom theme, the shipped Classic included, as `<name> (undefined)` instead of `<name> (Light)` or `<name> (Dark)`. Choosing one gives the dark base whatever its `inherits:` line says, with only the theme's own properties changed and every other colour left as the previous theme had it. Window > Theme > Reload from disk then reads the files again but never applies the active theme, so an edit to it does not show until the IDE is restarted. No message is shown. It was observed in an IDE started with an `APPDATA` of its own, by reading the theme list and the CSS variables of the IDE's page.

**To Reproduce**
Steps to reproduce the behavior:
1. Close the IDE. There is no project to open: the defect is in how the IDE reads its theme folders. In `%APPDATA%\twinBASIC\themes` (the IDE creates the folder), write `AtStart.theme`:
   ```
   inherits: light;
   MenuBackColor: rgb(255, 0, 0);
   ```
   and `Dark.theme`, with any text: its contents are not read.
2. Start the IDE and cancel the New / Open dialog. Open Window > Theme: it lists `Classic (undefined)` and `AtStart (undefined)`.
3. Choose `AtStart`: the IDE takes the dark base (dark panels, the dark code editor) with a red menu bar.
4. Change the colour in `AtStart.theme` to `rgb(0, 128, 0)` and choose Window > Theme > Reload from disk: the menu bar stays red.
5. Delete `Dark.theme` and restart the IDE: the list shows `Classic (Light)` and `AtStart (Light)`, `AtStart` gives the light base with a red menu bar, and Reload from disk after the same edit turns the menu bar green at once.

**Expected behavior**
The themes keep their parents whatever else the common folder holds, as in step 5: `Classic (Light)` and `AtStart (Light)` in the list, the light base for `AtStart`, and Reload from disk applying the edit. A `Dark.theme` or `Light.theme` there is either ignored, as the code means it to be, or replaces the shipped theme of that name.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The cause, read from `ide\main.js`: `reloadThemesFromDisk`, which runs at start-up and for Reload from disk, counts every `.theme` file of both folders into `customThemesCount`, but in the common folder it skips `Dark.theme` and `Light.theme` without calling `addTheme`. `addTheme` links the themes to their parents (`inheritsFromLink` and `group`), and runs `afterRefreshedThemes`, only once `customThemes.length` reaches `customThemesCount`, which then never happens. Reload from disk applies the theme in `afterRefreshedThemes`, so that never runs either. Counting only the files that are added would cure both.

Only `Dark.theme` was tried; `Light.theme` takes the same branch of the code. The file was in place when the IDE started; adding it and choosing Reload from disk goes through the same function, and was not tried.

Severity: moderate. Nothing is lost, but copying the shipped `Dark.theme` into the common folder to change it, the obvious way to adjust a shipped theme, makes every custom theme wrong, and nothing says why.

<!-- Reproducer: bugs/theme-override-breaks-inheritance/ (mode lane: asserted by `ide-test.bat --only customising` (test/ide/customising.test.mjs), the test "a Dark.theme in the APPDATA themes folder unlinks every custom theme, and Reload from disk stops applying", which passes on BETA 1005; the first test of that file is the control without Dark.theme, and passes too). No project and no zip: the steps write the theme files. docs/IDE/Customising/Themes.md carries a WARNING for it, the first of its two; when a fixed build is released, that WARNING goes. Found 2026-10-11 in the trials for the Customising pages. -->
