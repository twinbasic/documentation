Filed as [twinbasic/twinbasic#2483](https://github.com/twinbasic/twinbasic/issues/2483).

## `TextBox.Text` assigned in code is not limited by `MaxLength`, where VB6 truncates it

**Describe the bug**
With `MaxLength` set to 3, `Text1.Text = "abcdef"` stores all six characters and `Len(Text1.Text)` is 6. VB6 truncates the new text to `MaxLength` characters: `Text` reads `abc`. `SelText` is affected in the same way: with `Text` equal to `"ab"` and the caret at the end, assigning `SelText = "cdef"` leaves `abcdef` in twinBASIC and `abc` in VB6. The `Text` property setter of the VB package sends `WM_SETTEXT` to the edit control, and the whole string is stored. Observed by reading `Text` back.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `textbox-text-ignores-maxlength.twinproj` (attached as `textbox-text-ignores-maxlength.zip`). Its `Form1` holds one `TextBox`, `Text1`, and its `Sub Main` loads the form, sets `Text1.MaxLength = 3`, assigns `Text` and `SelText`, and prints what `Text` holds.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   Text = "abcdef": [abcdef] Len 6
   SelText = "cdef" after "ab": [abcdef] Len 6
   ```

**Expected behavior**
The text is cut to `MaxLength` characters, as in VB6 (the VB6 project, attached as `textbox-text-ignores-maxlength-vb6.zip`, prints):
```
Text = "abcdef": [abc] Len 3
SelText = "cdef" after "ab": [abc] Len 3
```
A program that relies on `MaxLength` to bound a field, for instance one that stores `Text` in a fixed-size record, gets a string longer than the limit.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low to medium. Typing into the box was not tried; the gap is the assignment in code.

What was tried: BETA 983 prints the same two lines. Assigning the same long text a second time raises no `Change` event, in twinBASIC and in VB6.

<!-- Reproducer: bugs/textbox-text-ignores-maxlength/ (mode run, expects the two lines above in twinBASIC); verified on 995 and 983. The VB6 project is in bugs/textbox-text-ignores-maxlength/vb6/ (`bug_repro.mjs vb6 textbox-text-ignores-maxlength` prints the two lines above). Stated in docs/Reference/Default/VB/TextBox/index.md, the MaxLength section, in a WARNING that names BETA 995 ("assigning Text in code is not limited by MaxLength"): when fixed, remove it and state that Text is truncated. -->
