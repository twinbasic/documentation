Filed as [twinbasic/twinbasic#2529](https://github.com/twinbasic/twinbasic/issues/2529).

## The shipped `Dark.theme` and `Light.theme` lack a `;` after `DiagnosticsGroupFontSize`, so the IDE loads neither it nor `DiagnosticsGroupFontWeight`

**Describe the bug**
Line 63 of both `themes\Dark.theme` and `themes\Light.theme`, the two theme files that the IDE ships and that every other theme inherits from, reads `DiagnosticsGroupFontSize: 90%` with no `;` at its end. The IDE's theme loader cuts a theme file into properties at each `;`, so the property runs into the next line, and the piece it cuts is not a property. The loader drops such a piece without a message, so both `DiagnosticsGroupFontSize` and `DiagnosticsGroupFontWeight` are lost. Each of the two files has 495 properties that load, and these 2 are not among them. No other piece of the three shipped theme files (`Classic.theme` is the third) is dropped.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `themes\Dark.theme`, in the folder of the twinBASIC installation, in a text editor. There is no project to attach: the defect is in the installation's own files.
2. Lines 63 and 64 read:
   ```
   DiagnosticsGroupFontSize:               90%
   DiagnosticsGroupFontWeight:             500;
   ```
   Line 63 ends without the `;` that ends line 64 and every other property of the file. (In the file, the spaces after each colon are tabs.) `themes\Light.theme` has the same two lines at the same place.
3. Open `ide\main.js` and find `applyThemeData`, the function that loads a theme file. It removes the `/* */` comments, cuts the text at each `;` followed by a space, a tab or a line end, removes the line breaks from each piece, cuts each piece at each `: ` and `:` followed by a tab, and keeps a piece only if that gives exactly two parts (the name and the value). Lines 63 and 64 are one piece, `DiagnosticsGroupFontSize:` and its value, then `DiagnosticsGroupFontWeight:` and its value, with nothing between them but the line break the loader removes. It gives three parts, so the piece is dropped. The loader's code has no other branch for a piece, and it writes no message.
4. Instead of reading the code, run `node scripts/probe_theme_semicolon.mjs` from the repository. It applies the same rule to every `.theme` file in the install's `themes` folder, and prints one line for each piece it drops. It starts no IDE.

**Expected behavior**
Both properties load, with the values the files give: a font size of `90%` and a font weight of `500` for the Diagnostics group. That needs a `;` at the end of line 63 in both files. Any other property run together with the next one is lost in the same way, so the loader could also say which piece it dropped, in the DEBUG CONSOLE or the IDE's trace output.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
BETA 997 and 957 have the same two lines at the same place. `Classic.theme` has no such piece: it contains `inherits: light;` and its own properties, all of which end with `;`. The loader's rule was checked by applying the code of `applyThemeData` unchanged to each file: `Dark.theme` and `Light.theme` give 495 properties each, without the two, and `Classic.theme` gives 188.

The effect on screen was not observed. In the IDE's `styles.css`, the rule of `.problemNodeGroup` reads `font-weight: var(--themeDiagnosticsGroupFontWeight); font-size: var(--themeDiagnosticsGroupFontSize);`, and the loader sets one CSS variable for each property it loads, so with these two missing, the variables have no value. By the CSS rules, a `var()` of a variable with no value makes the declaration invalid when the style is computed, and `font-size` and `font-weight` then take the value they inherit. So the elements of that class (by its name, the group headings of the Problems panel) would use the size and weight they inherit instead of 90% and 500.

Severity: low. No data is lost, and the look of one kind of heading is the only thing that changes, but the IDE says nothing about it. A theme file that sets the two properties again, with its `;`, avoids it: a custom theme that inherits from Dark or Light, with `DiagnosticsGroupFontSize: 90%;` and `DiagnosticsGroupFontWeight: 500;` among its own lines, loads them.

<!-- Reproducer: bugs/theme-missing-semicolon/ (mode probe: scripts/probe_theme_semicolon.mjs reads every .theme file in the install's themes folder with the rule of applyThemeData in ide/main.js and prints one line for each piece the loader drops; exit 1 while the defect is there). No project and no zip, as for the entry about the IDE's styles.css. `verify` reproduces on BETA 1005; the probe prints the same two lines on 997 and 957. No page carries a callout for it. If a page of the IDE section describes the theme file format, it states the loader's rule (read from main.js) and may name this fault; when it is fixed, the sentence naming it goes. The "custom theme avoids it" sentence in Severity follows from the loader's rule and was not tried in the IDE. The effect on screen (Problems panel group headings) is read from styles.css and the CSS rules, not seen. -->
