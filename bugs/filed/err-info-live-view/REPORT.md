Filed as [twinbasic/twinbasic#2503](https://github.com/twinbasic/twinbasic/issues/2503).

## The error information twinBASIC leaves in the thread's slot reads from `Err` as it is later, and stays there after the error is handled

**Describe the bug**
After an `Err.Raise` that is handled, the calling thread's `IErrorInfo` slot holds one object that reads its five values from `Err` each time a method of it is called, and nothing takes it out of the slot. After `Err.Clear` it returns empty strings, and after the next `Err.Raise` it returns the new error's values, where the COM contract has an `IErrorInfo` keep what was stored in it. And `GetErrorInfo` finds the object even when the error was handled in twinBASIC code that never reads the slot, where it should find the slot empty, so a later failure that carries no error information is described by whatever `Err` holds at that moment. Observed in a run of the reproducer project, which uses no class and no interface for the first symptom.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `err-info-live-view.twinproj` (attached as `err-info-live-view.zip`) and run it (F5). It declares `IErrorInfo` and `GetErrorInfo` and, under `On Error Resume Next`, prints:
   ```
   read at once: [My.Source] [My description]
   after Err.Clear: [] []
   Err after the call: -2147220270 [My description]
   slot afterwards: [My.Source] [My description]
   E_FAIL after the cleared error: -2147467259 [Unspecified error]
   E_FAIL, slot emptied first: -2147467259 [Automation error]
   ```
2. The first two lines come from `Err.Raise vbObjectError + 1234, "My.Source", "My description"`, then `GetErrorInfo 0, info`, one read of `info.GetSource()` and `info.GetDescription()`, then `Err.Clear` and a second read of the same `info`. The second read returns empty strings.
3. The third and fourth lines: a method of a class, called through an interface, raises the same error; the caller handles it and reads `Err`, then calls `GetErrorInfo`. It returns an object, with the values `Err` holds, although the caller already has the error in `Err` and nothing should be left to read (a second `GetErrorInfo` then returns `S_FALSE`).
4. The last two lines: a method that fails with `Err.ReturnHResult = &H80004005` and sets no error information. When the call comes after a raised error that the program has cleared with `Err.Clear`, `Err.Description` is `Unspecified error`, the system text for an empty description; after the slot has been emptied with `GetErrorInfo`, it is `Automation error`, the text twinBASIC uses for a failure that carries no information.

**Expected behavior**
`IErrorInfo` holds the values it was given, as an object made with `CreateErrorInfo` does: a read after `Err.Clear` or after another error returns the first error's source and description. A handled error leaves the slot empty, as in VB6 (the same sequence, with an `Err.Raise 5` handled in the procedure, and with a raise in a class method handled by the caller, finds `GetErrorInfo` returning `S_FALSE` and no object), so that `Err.Description` of a later failure does not depend on what ran before. The failure with no information should always give the same description. The VB6 project is attached as `err-info-live-view-vb6.zip`; it prints `empty (GetErrorInfo 1)` for the slot on a fresh thread, after an `Err.Raise 5` handled in the procedure, after a class method that raised an error the caller handled (`Err` then holds `-2147220270 [Something failed on purpose] [Probe.Subject]`), and after a class method that handled its own error.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
The two symptoms are one bug because the object is the same: `ObjPtr` of what `GetErrorInfo` returns is identical after an `Err.Raise` handled in the same procedure, after a failed call through an interface, after a failure with `SetErrorInfo` plus `Err.ReturnHResult`, and after a call that handled its own error, and it is not `Err` itself. One object, installed in the slot whenever an error occurs or a failure is processed and reading `Err`, accounts for both. They can be fixed apart: a snapshot object would fix the first, and withdrawing the object once the error is delivered, the second.

What does not reproduce it: a fresh thread (`GetErrorInfo` returns `S_FALSE`); a caller that makes the call through an interface whose methods are declared `[PreserveSig]` and reads the slot itself, where the first `GetErrorInfo` returns the values and the second returns `S_FALSE`; the second `GetErrorInfo` after the object has been read from the slot (it returns `S_FALSE`, so `GetErrorInfo` does empty the slot).
Severity: low. The slot is not a documented twinBASIC interface, but a program that reads error information with the COM functions, or a library that does, sees values that change under it, and a program cannot rely on the description of a failure that came with no error information.

<!-- Reproducer: bugs/err-info-live-view/ (mode run, expects the lines above); verified on 995. The VB6 slot results (empty after Err.Raise 5 in the procedure, after a raise in a class method handled by the caller, and after a class method that handled its own error) are from bugs/err-info-live-view/vb6/; the full set of probes (T1 to T10, with ObjPtr) is in s71/liveview/, a local scratch folder that is not in the repository. Stated in docs/Reference/COM-Interfaces/IErrorInfo.md, in two WARNINGs that name BETA 995: the one after "**GetErrorInfo** empties the slot" in *A method that raises an error*, and the one that begins "the slot is not always empty" under *A failure with no error information*. When fixed, remove each; the table of Automation error and the `emptySlot` samples need no change except the sentence about a stale object. -->
