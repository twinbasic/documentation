Filed as [twinbasic/twinbasic#2487](https://github.com/twinbasic/twinbasic/issues/2487).

## `Unadvise` with a cookie that names no connection succeeds, where VB6 returns CONNECT_E_NOCONNECTION

**Describe the bug**
On the connection point of a twinBASIC class that has an `Event`, `Unadvise` with a cookie that names no connection (0 and 99 were tried) succeeds silently and does nothing. The COM contract returns an error, and VB6 returns `CONNECT_E_NOCONNECTION` (`&H80040200`).

**To Reproduce**
Steps to reproduce the behavior:
1. Open `advise-unadvise-hresults.twinproj` (attached as `advise-unadvise-hresults.zip`). Its one source file, `Startup.twin`, declares the project's own copies of the connection-point interfaces (`stdole` has none of them), a class `Source` with one event, and a class `NotASink` with one field. `Sub Main` runs, with `On Error Resume Next`:
   ```
   cookie = point.Advise(sink)    ' sink is a NotASink
   point.Unadvise 0
   point.Unadvise 99
   ```
2. Run the project in the IDE (F5).
3. See in the DEBUG CONSOLE:
   ```
   Advise, a sink without the outgoing interface: error=80004002
   Unadvise 0: error=0
   Unadvise 99: error=0
   ```

**Expected behavior**
`Unadvise` reports the bad cookie, as VB6 does. The page for [IConnectionPoint::Unadvise](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nf-ocidl-iconnectionpoint-unadvise) lists `E_POINTER` for "The value in *dwCookie* does not represent a valid connection", and `CONNECT_E_NOCONNECTION` is the code the `CONNECT_E_` range has for it. It is not `S_OK`.

The same calls on the connection point of a VB6 class with an event, made through `DispCallFunc` (the VB6 project is attached as `advise-unadvise-hresults-vb6.zip`):
```
Advise, a sink without the outgoing interface: error=80004002
  cookie=-1
Unadvise 99: error=80040200
before Unadvise 0
```
`Unadvise 0` comes last because it ends the VB6 exe with an access violation (`0xC0000005` in `MSVBVM60.DLL`). twinBASIC's 0 for that cookie is no worse than VB6's crash; the cookie 99 is the clean comparison.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low. A client that releases a connection twice, or with a wrong cookie, is told it worked.

`Advise` with a sink that does not answer `QueryInterface` for the outgoing interface fails with `E_NOINTERFACE` (`&H80004002`), where the Windows SDK page for [IConnectionPoint::Advise](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nf-ocidl-iconnectionpoint-advise) says the method "must return CONNECT_E_CANNOTCONNECT" (`&H80040201`). VB6 returns `E_NOINTERFACE` too, so that is not reported here; the reproducer prints it as a control. A sink that is an ordinary twinBASIC class gives the same `E_NOINTERFACE` whether it has no members or implements `IDispatch` (the outgoing interface's identifier is generated for each build, so a twinBASIC class cannot answer for it). Nothing is connected afterwards, and no event reaches the sink. Calling `Unadvise` a second time with the cookie of the failed `Advise`, which is 0, also returns without an error.
<!-- Reproducer: bugs/advise-unadvise-hresults/ (mode run, expects tbrun exit 0 and the three lines above); verified on 995. VB6 side in bugs/advise-unadvise-hresults/vb6/ (VB6 6.0), the output above; it ends at `before Unadvise 0` because that call crashes the exe. Narrowed to Unadvise at the owner's word (2026-10-04), since VB6 also returns E_NOINTERFACE from Advise. Stated in docs/Reference/COM-Interfaces/IConnectionPoint.md, sections Advise (the second bullet of "In twinBASIC", which says VB6 returns E_NOINTERFACE too: no change when this is fixed) and Unadvise (the WARNING, which names BETA 995, about a cookie that names no connection) and the last example, whose comments show 80004002 and 0: when fixed, remove the WARNING, and change the rest. When the page is updated, state the code twinBASIC returns for a bad cookie. -->
