Filed as [twinbasic/twinbasic#2490](https://github.com/twinbasic/twinbasic/issues/2490).

## A late-bound call to a member that does not exist raises &H80020006, and `CallByName` raises &H80004005, where VB6 raises 438

**Describe the bug**
Calling a member that an object does not have, through an `Object` variable, raises error `&H80020006` (`DISP_E_UNKNOWNNAME`, *Unknown name.*) instead of 438, *Object doesn't support this property or method*. `CallByName` with the same name raises `&H80004005`, *Unspecified error*. An `On Error` handler written for VB6 or VBA, which tests for 438, does not catch either. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `latebound-unknown-member-error.twinproj` (attached as `latebound-unknown-member-error.zip`). Its one source file, `Startup.twin`, holds a class `Widget` with a `Sub Hello()` and a `Sub Main` that calls members through `Object` variables, with `On Error Resume Next`.
2. Run it and read the DEBUG CONSOLE:
   ```
   o.Nope -> error -2147352570 (80020006) [Unknown name.]
   Collection.Nope -> error -2147352570 (80020006) [Unknown name.]
   CallByName o, Nope -> error -2147467259 (80004005) [Unspecified error]
   o.Hello (control) -> error 0 (0) []
   ```

**Expected behavior**
Error 438 for all three, as in VB6 and VBA. The same cases in a VB6 project (a class, a `Variant` holding it, a `Collection`, a `Scripting.Dictionary`, and `CallByName` on each of them), attached as `latebound-unknown-member-error-vb6.zip`:
```
o.Nope (class) -> error 438 (1B6) [Object doesn't support this property or method]
v.Nope (class in a Variant) -> error 438 (1B6) [Object doesn't support this property or method]
Collection.Nope -> error 438 (1B6) [Object doesn't support this property or method]
Dictionary.Nope -> error 438 (1B6) [Object doesn't support this property or method]
CallByName class Nope -> error 438 (1B6) [Object doesn't support this property or method]
CallByName Dictionary Nope -> error 438 (1B6) [Object doesn't support this property or method]
CallByName Collection Nope -> error 438 (1B6) [Object doesn't support this property or method]
```
twinBASIC already maps `DISP_E_MEMBERNOTFOUND` from `Invoke` to 438; `DISP_E_UNKNOWNNAME` from `GetIDsOfNames`, which is the answer for a name the object does not have, should be mapped the same way, and `CallByName` should not turn it into `E_FAIL`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: code ported from VB6 or VBA that probes an object for a member with `On Error` and 438 stops working, and the message names a COM code instead of the problem.

The twinBASIC class's `GetIDsOfNames` itself is right: it returns `DISP_E_UNKNOWNNAME` for a name it does not know, as the contract says; the conversion into a run-time error is what differs. The same `&H80020006` came from a twinBASIC class, a `Collection`, a `Scripting.Dictionary` and a `Scripting.FileSystemObject`, and a `Variant` holding an object; `CallByName` gave `&H80004005` for a twinBASIC class and a `Dictionary`. Other failures are mapped as VB6 does: a call that `Invoke` rejects with `DISP_E_MEMBERNOTFOUND` raises 438, and a `Nothing` object raises 91.

<!-- Reproducer: bugs/latebound-unknown-member-error/ (mode run, expects the three lines above); verified on 995. VB6 output from bugs/latebound-unknown-member-error/vb6/ (VB6 6.0, Probe.exe). Stated in docs/Reference/COM-Interfaces/IDispatch.md, the first two rows of the table under "Errors from a late-bound call" and the first NOTE below it (In VBA an unknown member raises error 438); when fixed, delete the rows and the NOTE, and check docs/Reference/Default/VBA/Interaction/CallByName.md, which does not mention either code today, and anywhere else that lists the errors CallByName raises. -->
