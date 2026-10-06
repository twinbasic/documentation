Filed as [twinbasic/twinbasic#2489](https://github.com/twinbasic/twinbasic/issues/2489).

## A twinBASIC class's `GetTypeInfo` with an `iTInfo` of 1 returns E_UNEXPECTED, not DISP_E_BADINDEX

**Describe the bug**
`IDispatch::GetTypeInfo` on an object of a twinBASIC class returns `E_UNEXPECTED` (`&H8000FFFF`) for any `iTInfo` other than 0. The object's `GetTypeInfoCount` returns 1, so 0 is the only valid index, and the contract gives `DISP_E_BADINDEX` for a bad one. Observed in a run of the reproducer project, calling the method through a project's own declaration of the interface.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `gettypeinfo-badindex.twinproj` (attached as `gettypeinfo-badindex.zip`). Its one source file, `Startup.twin`, declares a copy of `IDispatch` with the same `[InterfaceId]` (the `stdole` declaration cannot be called), a class `Widget` with one `Sub`, and a `Sub Main` that calls `GetTypeInfoCount` and `GetTypeInfo` on a `Widget` through the copy.
2. Run it and read the DEBUG CONSOLE:
   ```
   GetTypeInfoCount = 1
   GetTypeInfo(0): HRESULT 0, pointer returned True
   GetTypeInfo(1): HRESULT 8000FFFF, error -2147418113, pointer returned False
   GetTypeInfo(2): HRESULT 8000FFFF, error -2147418113, pointer returned False
   GetTypeInfo(-1): HRESULT 8000FFFF, error -2147418113
   ```

**Expected behavior**
`DISP_E_BADINDEX` (`&H8002000B`), which the `IDispatch::GetTypeInfo` documentation gives for an index that is not valid, for an index the object does not have. `E_UNEXPECTED` (*Catastrophic failure*) is the code for a call made at a time when the object cannot take it, and it reads as a fault in the object.

VB6 does not return `E_UNEXPECTED`. The same calls on a VB6 class, made through `DispCallFunc` (the VB6 project is attached as `gettypeinfo-badindex-vb6.zip`), return `TYPE_E_ELEMENTNOTFOUND` (`&H8002802B`) for every index but 0:
```
GetTypeInfoCount = 1 (HRESULT 0)
GetTypeInfo(0): HRESULT 0, pointer returned True
GetTypeInfo(1): HRESULT 8002802B, pointer returned False
GetTypeInfo(2): HRESULT 8002802B, pointer returned False
GetTypeInfo(-1): HRESULT 8002802B, pointer returned False
```
Either `DISP_E_BADINDEX` or VB6's `TYPE_E_ELEMENTNOTFOUND` says that the index names nothing; `E_UNEXPECTED` does not.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: minor. A caller that checks for `DISP_E_BADINDEX` to learn that an object has no more type information gets a different code; `GetTypeInfo(0)` and `GetTypeInfoCount` are right.

<!-- Reproducer: bugs/gettypeinfo-badindex/ (mode run, expects the GetTypeInfo(0) and GetTypeInfo(1) lines above); verified on 995. VB6 output from bugs/gettypeinfo-badindex/vb6/ (VB6 6.0, Probe.exe). Stated in docs/Reference/COM-Interfaces/IDispatch.md, the GetTypeInfo section ("For 1 it fails with E_UNEXPECTED ..., not with DISP_E_BADINDEX"); when fixed, say that it fails with DISP_E_BADINDEX. -->
