Filed as [twinbasic/twinbasic#2504](https://github.com/twinbasic/twinbasic/issues/2504).

## `Err.Raise` without a source or a description leaves `Source` empty, and the defaults are not VBA's

**Describe the bug**
`Err.Raise` called with only a number leaves `Err.Source` empty, where VBA and VB6 set it to the name of the project. It gives `Err.Description` an empty string for numbers such as 1, 95, 99 and 513, where VBA gives `Application-defined or object-defined error`, and `Automation error` for numbers from 1000 up, where VBA gives the same generic text. And an omitted argument no longer keeps the value an earlier `Err.Raise` left, which VBA-Docs describes for `Raise`. Observed in a run of the reproducer project, in the IDE and in a built exe alike.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `err-raise-defaults.twinproj` (attached as `err-raise-defaults.zip`) and run it (F5). Its `Sub Main` raises with `On Error Resume Next` and prints `[Err.Source] [Err.Description]` after each call, calling `Err.Clear` first except in the last case:
   ```
   Err.Raise 5
   Err.Raise 1
   Err.Raise 513
   Err.Raise 1000
   Err.Raise 1000, "A.Src", "B desc"
   Err.Raise 5
   ```
2. See, beside what the same program prints when built in VB6 (the VB6 project is attached as `err-raise-defaults-vb6.zip`):

   | call | twinBASIC | VB6 |
   |---|---|---|
   | `Err.Raise 5` | `[] [Invalid procedure call or argument]` | `[Probe] [Invalid procedure call or argument]` |
   | `Err.Raise 1` | `[] []` | `[Probe] [Application-defined or object-defined error]` |
   | `Err.Raise 513` | `[] []` | `[Probe] [Application-defined or object-defined error]` |
   | `Err.Raise 1000` | `[] [Automation error]` | `[Probe] [Application-defined or object-defined error]` |
   | `Err.Raise 5` after a full `Err.Raise 1000, "A.Src", "B desc"`, no `Err.Clear` between | `[] [Invalid procedure call or argument]` | `[A.Src] [B desc]` |

   The rule for the description, from a sweep of every number from 0 to 65537: a number with a built-in message (5, 11, 13 and 84 others, the ones `Error$` knows) gets that message, as in VBA. A number from 1 to 746 without one gets an empty string. A number from 747 up gets the Windows system message for that number when there is one (1001 gives `Recursion too deep; the stack overflowed.`, 15861 a licensing message) and `Automation error` when there is none. A negative number is looked up as an `HRESULT` the same way (`vbObjectError + 1` gives `Invalid advise flags`, `vbObjectError + 513` gives `An event was unable to invoke any of the subscribers`, `vbObjectError + 1000` gives `Automation error`). `Error$(n)` and the `Error n` statement give VBA's generic text for all of these.

**Expected behavior**
What VBA-Docs states for `Err.Raise`, which VB6 does as well: `Source` is the programmatic ID of the project when *source* is omitted; *description* is the message of the built-in error, or `Application-defined or object-defined error` when there is none; and an omitted argument is taken from the properties of `Err` when they still hold an earlier error's values. A program that reads `Err.Source` to find where an error came from, or tests `Err.Description <> ""`, behaves differently without any diagnostic.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low for a program that passes all the arguments; for one that does not, `Err.Source` and `Err.Description` are not what the VBA code it was ported from expects. The result is the same for an error raised in a method of a class and read by its caller, apart from an empty description, which arrives as `Application-defined or object-defined error` there. It is also the same in a built exe.

Related and also different from VB6: `Err.Raise 65536` is accepted, and `Err.Number` is 65536, where VB6 raises error 5. `Err.Raise 0` raises error 5 in both. An explicit empty string for the source or the description gives an empty `Source` or `Description`, in VB6 as well. `Err.HelpContext` is 0 in twinBASIC, and VB6 sets it to 1000000 plus the number for a `Raise` without one (`1000005` for 5).

<!-- Reproducer: bugs/err-raise-defaults/ (mode run, expects the five lines above in twinBASIC); verified on 995. VB6 side from the same program, in bugs/err-raise-defaults/vb6/; the full sweep and the per-number lists are in s71/raise/ (out-tb-995.txt, out-vb6.txt, analyze.mjs), local scratch files that are not in the repository. Stated in docs/Reference/Default/VBA/ErrObject/Raise.md (the table under *description* and the WARNING after it, which names BETA 995, plus the check_run sample), in Source.md (the WARNING) and in Description.md (the WARNING); docs/Reference/COM-Interfaces/IErrorInfo.md says GetSource returns an empty string and GetDescription the standard text when Raise gets neither. When fixed, remove those WARNINGs, delete the table, restore the sentences about the project's programmatic ID, the generic message and the carried-over values, and rewrite the sample's expected output. docs/Reference/Default/VBRUN/ErrorContext/index.md says Source is the project name for errors raised inside a project; that is not what Err.Source holds and should be checked when this is fixed. -->
