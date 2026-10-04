Filed as [twinbasic/twinbasic#2464](https://github.com/twinbasic/twinbasic/issues/2464).

## `StrConv` with `vbProperCase` leaves a word in lowercase when it follows an even number of separators

**Describe the bug**
`StrConv(s, vbProperCase)` capitalises the first letter of a word that follows one, three or five separator characters (space, tab, `vbCr`, `vbLf`, vertical tab, form feed, NUL), and a word at the start of the string. After two, four or six separators the word is left in lowercase, so every word after a `vbCrLf` in multi-line text stays lowercase, and so does the second word of `"a  b"` (two spaces). It is a regression: BETA 983 capitalised every word. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `proper-case-even-separators.twinproj` (attached as `proper-case-even-separators.zip`). Its one source file, `Startup.twin`, has a `Sub Main` that calls `StrConv` with `vbProperCase` on `"a b"`, `"a  b"`, `"a   b"` and `"a" & vbCrLf & "b"`.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   one space:    [A B]
   two spaces:   [A  b]
   three spaces: [A   B]
   vbCrLf:       [A<CRLF>b]
   ```

**Expected behavior**
Every word is capitalised, whatever the number of separators before it: `[A  B]` and `[A<CRLF>B]`. VB6 does so (attached as `proper-case-even-separators-vb6.zip`, which prints `[A  B]` and `[A<CRLF>B]`), and so does BETA 983.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: medium. Text with a line break or with aligned columns comes out half capitalised, and nothing reports it.

With `"a" & Space$(n) & "b" & Space$(n) & "c"`, n = 0 gives `Abc` and n = 1, 3 and 5 give every word capitalised; n = 2, 4 and 6 give `A`, then `b` and `c` in lowercase. A space followed by a tab counts as two separators, and `" a  b  c "` (one leading space) comes out as `" a  b  c "`, all lowercase. The result is the same with an explicit `LCID` of 1033. It looks as if each separator toggles a "capitalise the next letter" flag instead of setting it. BETA 983 and VB6 give the same result as each other for all of these.

<!-- Reproducer: bugs/proper-case-even-separators/ (mode run, expects the four lines above); verified on 995, 983 gives `[A  B]` and `[A<CRLF>B]`. docs/Reference/Default/VBA/Strings/StrConv.md carries a WARNING about this ("BETA 995 has a defect in vbProperCase ..."); when fixed, replace it with a NOTE saying since which build. -->
