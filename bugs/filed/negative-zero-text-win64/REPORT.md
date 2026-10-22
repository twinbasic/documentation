Filed as [twinbasic/twinbasic#2547](https://github.com/twinbasic/twinbasic/issues/2547).

## A 64-bit build prints a negative zero as `-0`

**Describe the bug**
A `Single` or `Double` that holds a negative zero (the sign bit set, every other bit clear) converts to the text `-0` in a 64-bit build: `CStr`, `Str$` (with no leading space), `Format$`, concatenation with `&` and `Debug.Print` all give it. A 32-bit twinBASIC build gives `0` (`Str$` gives ` 0`), and so does VB6. Both builds hold the negative zero: the sign bit (`&H80000000` in a `Single`, `&H8000000000000000` in a `Double`) is read back through `RtlMoveMemory`, and the value compares equal to 0. It was found on a page of the documentation whose sample prints a GDI+ matrix offset that is a negative zero, `0 5 -0` in a 64-bit build where the page says `0 5 0`. It was observed in IDE runs.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `negative-zero-text-win64.twinproj` (attached as `negative-zero-text-win64.zip`). Its module `NegativeZeroTextTests` has one `[TestCase]` for each conversion, asserting what VB6 gives, two cases that check the sign bit, and two controls.
2. Run the test cases as a 64-bit build (`tbrun --tests --arch win64`). The seven conversion cases fail, with `-0` as `Actual`; the sign-bit cases and the controls pass. As a 32-bit build all eleven pass.
3. The shortest form of it, in a 64-bit build:
```vb
Dim s As Single
s = 0!
s = -s
Debug.Print CStr(s), Str$(s), Format$(s), "x=" & s   ' VB6 and 32-bit: 0  " 0"  0  x=0 ; 64-bit: -0  -0  -0  x=-0
```

**Expected behavior**
The same text in a 64-bit build as in a 32-bit one and in VB6: `0` from `CStr`, `Format$` and `&`, and ` 0` from `Str$`. The reproducer's `vb6/` project prints them (attached as `negative-zero-text-win64-vb6.zip`).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The reproducer's `repro.json` names the 64-bit build (`"arch": "win64"`). A positive zero and an ordinary negative number (`-1.5`) print the same in both builds. Severity: low. A negative zero is the result of `-x` for a zero `x`, and a COM or API result can hold one, so a program meets it, and one that shows or compares the text behaves differently in the two builds.

<!-- Reproducer: bugs/negative-zero-text-win64/ (mode test, arch win64: `tbrun --tests --arch win64` runs the eleven cases; expect lists the seven FAIL and four PASS lines); verify reproduces on BETA 1010; VB6 side in vb6/ (Module1.bas). docs/Reference/Default/VBA/Conversion/CStr.md, docs/Reference/Default/VBA/Conversion/Str.md and docs/Reference/Default/VBA/Strings/Format.md carry the callout for it (a WARNING each); docs/Reference/Contributed/GdiPlus/LinearGradientBrush.md has a check_run sample whose output "0 5 0" differs on win64 (not yet changed); when a fixed build is released, the callouts go. Found 2026-10-19 on the GdiPlus page. -->
