Filed as [twinbasic/twinbasic#2525](https://github.com/twinbasic/twinbasic/issues/2525).

## `DateAdd` with a month, quarter or year interval runs into the next month instead of stopping at the last day of a shorter month

**Describe the bug**
`DateAdd` with the interval `"m"`, `"q"` or `"yyyy"` keeps the day of the month and lets it overflow into the next month, where it should stop at the last day of the month it lands in. `DateAdd("m", 1, #1/31/2026#)` returns March 3, 2026, the date `DateSerial(2026, 2, 31)` gives, and not February 28. No error is raised, so nothing shows that the date is wrong. The VBA documentation, and twinBASIC's own page for `DateAdd` after it, say that `DateAdd` does not return an invalid date and that adding a month to January 31 returns February 28; VB6 does that. The other intervals (`"d"`, `"y"`, `"w"`, `"ww"`, `"h"`, `"n"` and `"s"`) give the right dates. Observed in the IDE, with the result of each call written to the DEBUG CONSOLE as `Format(..., "yyyy-mm-dd")`.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `dateadd-month-end-overflow.twinproj` (attached as `dateadd-month-end-overflow.zip`). Its one source file, `Startup.twin`, holds 18 calls, the first four of which are enough:
   ```
   Module Startup

       Public Sub Main()
           Debug.Print Format(DateAdd("m", 1, #1/31/2026#), "yyyy-mm-dd")
           Debug.Print Format(DateAdd("m", -1, #3/31/2026#), "yyyy-mm-dd")
           Debug.Print Format(DateAdd("yyyy", 1, #2/29/2024#), "yyyy-mm-dd")
           Debug.Print Format(DateAdd("q", 1, #11/30/2025#), "yyyy-mm-dd")
       End Sub

   End Module
   ```
2. Run the project in the IDE (F5) and read the DEBUG CONSOLE.
3. See `2026-03-03`, `2026-03-03`, `2025-03-01` and `2026-03-02`. VB6 (the same calls, attached as `dateadd-month-end-overflow-vb6.zip`, which writes each result to `out.txt`) gives `2026-02-28`, `2026-02-28`, `2025-02-28` and `2026-02-28`. The calls of the project, with the dates each gives:

   | call | twinBASIC | VB6 |
   |---|---|---|
   | `DateAdd("m", 1, #1/31/2026#)` | 2026-03-03 | 2026-02-28 |
   | the same, with the date in a `Date` variable | 2026-03-03 | 2026-02-28 |
   | `DateAdd("m", 1, "31-Jan-95")` | 1995-03-03 | 1995-02-28 |
   | `DateAdd("m", 1, #1/30/2026#)` | 2026-03-02 | 2026-02-28 |
   | `DateAdd("m", 1, #1/29/2026#)` | 2026-03-01 | 2026-02-28 |
   | `DateAdd("m", 1, #1/31/2024#)` | 2024-03-02 | 2024-02-29 |
   | `DateAdd("m", 1, #10/31/2026#)` | 2026-12-01 | 2026-11-30 |
   | `DateAdd("m", -1, #3/31/2026#)` | 2026-03-03 | 2026-02-28 |
   | `DateAdd("m", -1, #3/30/2026#)` | 2026-03-02 | 2026-02-28 |
   | `DateAdd("yyyy", 1, #2/29/2024#)` | 2025-03-01 | 2025-02-28 |
   | `DateAdd("yyyy", -1, #2/29/2024#)` | 2023-03-01 | 2023-02-28 |
   | `DateAdd("q", 1, #11/30/2025#)` | 2026-03-02 | 2026-02-28 |

What decides it: the result is the date `DateSerial(year, month + number, day)` gives, so a day that exists in the target month is not affected, and one that does not is counted into the month after.
- A day that exists in the target month is right: `DateAdd("m", 1, #1/28/2026#)` is 2026-02-28, and `DateAdd("yyyy", 4, #2/29/2024#)` is 2028-02-29, in both.
- The other intervals are right: on January 31, 2026, `"d"` and `"y"` with 1 give 2026-02-01 and `"ww"` with 1 gives 2026-02-07, in both.
- It makes no difference whether the date is a literal, a `Date` variable, `DateSerial(2026, 1, 31)` or a string; whether the number is positive or negative; or whether the date has a time of day, which is kept (`DateAdd("m", 1, #1/31/2026 13:45:10#)` is 2026-03-03 13:45:10). `DateAdd("m", 13, #1/31/2025#)` is 2026-03-03 as well.
- `DateSerial(2026, 2, 31)` is 2026-03-03 in VB6 too, by design: it is not the defect.

**Expected behavior**
`DateAdd` with the interval `"m"`, `"q"` or `"yyyy"` returns the last day of the target month when the day of the date does not exist in it, as VB6 does and as the VBA documentation says: January 31 plus one month is February 28 (29 in a leap year), and February 29 plus one year is February 28.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The same on BETA 997, 995 and 957. Not tried: an exe built from the project, and a project compiled with LLVM.

Severity: high. The date is wrong and nothing signals it. A program that steps by months or years from a date late in the month (due dates, subscriptions, schedules, a calendar control's next-month button) is up to three days late, and a second step continues from the wrong day: `DateAdd("m", 1, DateAdd("m", 1, #1/31/2026#))` is 2026-04-03, where VB6 gives 2026-03-28. A workaround: `DateSerial(Year(d), Month(d) + n + 1, 0)` is the last day of the month `n` months after `d`, so the result is `DateSerial(Year(d), Month(d) + n, Day(d))` when `Day(d)` is smaller than that day, and that day otherwise.

<!-- Reproducer: bugs/dateadd-month-end-overflow/ (mode run: `Sub Main` prints 18 cases with Debug.Print; expect is exit 0 and the 18 lines, which are the twinBASIC values of the twelve cases that overflow and of the six that do not; verify reproduces on BETA 1005, 997, 995 and 957, the oldest installed). expect names all twelve overflowing lines, so a fix of one interval alone makes verify say NO LONGER REPRODUCES: run `bug_repro.mjs run` and compare with the table for the intervals still wrong. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints the table's VB6 column. The 13-month and time-of-day variants, the chained call and the workaround were run once in scratch copies of the project (twinBASIC) and `scripts/vb6run.mjs` (VB6), not kept. Found while documenting the contributed package xCalendar: its NextMonth, PreviousMonth, NextYear and PreviousYear methods call DateAdd. docs/Reference/Default/VBA/DateTime/DateAdd.md carries a WARNING naming BETA 1005, and so do docs/Reference/Default/VBA/DateTime/index.md ("Date arithmetic", after its sample whose comment says 2/28/2026) and docs/Reference/Contributed/xCalendar/index.md (at the start of "Methods", and NextMonth and NextYear mention it): when fixed, the three WARNINGs and those mentions go. -->
