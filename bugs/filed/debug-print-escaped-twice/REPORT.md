Filed as [twinbasic/twinbasic#2444](https://github.com/twinbasic/twinbasic/issues/2444).

## Text that continues a `Debug.Print` line is escaped twice in the DEBUG CONSOLE

**Describe the bug**
When a `Debug.Print` statement ends with `;`, the next `Debug.Print` continues the same line, and the DEBUG CONSOLE escapes that continued text twice: `&`, `<` and `>` show as `&amp;`, `&lt;` and `&gt;`. The text that opens the line comes out right.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `debug-print-escaped-twice.twinproj` (attached as `debug-print-escaped-twice.zip`) and run it (F5). Its `Sub Main` holds the whole bug:
   ```
   Debug.Print "A";
   Debug.Print "&"
   ```
2. See the DEBUG CONSOLE show `A&amp;`. The project's other lines show the rest: `Debug.Print "a < b";` followed by `Debug.Print " and c > d"` shows `a < b and c &gt; d`. After three statements, `Debug.Print "C";`, `Debug.Print "D";` and `Debug.Print "<&>"`, the line reads `CD&lt;&amp;&gt;`.

**Expected behavior**
`A&`, `a < b and c > d` and `CD<&>`: the console shows what the program printed, whether it is one statement or several.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: cosmetic, but it changes what a program appears to print. Also on BETA 983, with the same output. What does not reproduce it: a whole line (`Debug.Print "a < b & c"` shows exactly that), and the same text in one statement (`Debug.Print "B"; "&"` shows `B&`). The cause looks to be `debugOutputPartial` in `ide/main.js`, which takes all of a program's output, and an add-in's `PrintText` too, and adds to a line that is still open: it passes the new text through `TEXTtoHTML` twice, once as it builds the text and again as it stores it. When the new text's colour differs from the line's, the `</span><span class='...'>` it puts in to change colour goes through the second pass too, so the tags themselves show as text. The colour comes from the output: a program's plain output is `debugConsoleOutputText`, and a `PrintText` is `debugConsoleOutputTextYELLOW`. With a line left open in the first, made by calling `debugOutputPartial` from the page, a `PrintText` from the IDE's own Sample 10 add-in showed as `</span><span class='debugConsoleOutputTextYELLOW'>Hello there from WaynesWorldAddIn!`. A program's own open line followed by a `PrintText` was not tried.

<!-- Recorded in scripts/lib/tb-ide-console.mjs (comment at line 39), which decodes the console's stored entries once, as the pane renders them; when fixed, check that decode. Measured with scripts/bug_repro.mjs (run mode, verify) on 995 and 983 (the 983 output is identical). Found while making the add-in harness read text that the IDE appends to an open console line. -->
