Filed as [twinbasic/twinbasic#2462](https://github.com/twinbasic/twinbasic/issues/2462).

## The `IEnumConnectionPoints` of a twinBASIC class raises `E_FAIL` at the end of the list, and `Skip` and `Clone` raise `E_NOTIMPL`

**Describe the bug**
The enumerator that `IConnectionPointContainer.EnumConnectionPoints` returns for a class with an `Event` does not follow the `IEnum` contract. `Next` raises `E_FAIL` when no item is left, and when more items are asked for than remain, where `S_FALSE` is expected. `Skip` and `Clone` both raise `E_NOTIMPL`. `Reset`, and `Next` with exactly one item left, work.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `enum-connection-points-contract.twinproj` (attached as `enum-connection-points-contract.zip`). Its one source file, `Startup.twin`, declares the project's own copies of `IConnectionPointContainer` and `IEnumConnectionPoints` (`stdole` has neither) and a class with one event. `Sub Main` gets the enumerator and calls it with `On Error Resume Next`:
   ```
   points.Next 1, item, fetched      ' the one point
   points.Next 1, item, fetched      ' at the end
   points.Reset
   points.Next 2, item, fetched      ' two asked for, one left
   points.Reset
   points.Skip 1
   Dim copy As IEnumConnectionPoints = points.Clone()
   ```
2. Run the project in the IDE (F5).
3. See in the DEBUG CONSOLE:
   ```
   Next 1, one point: error=0 LastHresult=0 fetched=1
   Next 1, at the end: error=80004005 LastHresult=0 fetched=0
   Next 2, one point: error=80004005 LastHresult=0 fetched=0
   Skip 1: error=80004001 LastHresult=0 fetched=0
   Clone: error=80004001 LastHresult=0 fetched=0
   ```

**Expected behavior**
The enumerator follows the contract, as the Windows SDK pages state it. [IEnumConnectionPoints::Next](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nf-ocidl-ienumconnectionpoints-next): "If there are fewer than the requested number of items left in the sequence, this method retrieves the remaining elements", *pcFetched* is the number retrieved, and "If the method retrieves the number of items requested, the return value is S_OK. Otherwise, it is S_FALSE." So the second call returns `S_FALSE` with 0 items and the third returns `S_FALSE` with 1. [Skip](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nf-ocidl-ienumconnectionpoints-skip) returns `S_OK`, or `S_FALSE` when it could not skip as many as asked. [Clone](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nf-ocidl-ienumconnectionpoints-clone) returns a new enumerator with the same state, and lists `E_INVALIDARG`, `E_OUTOFMEMORY`, `E_UNEXPECTED` and `S_OK`, not `E_NOTIMPL`. The sibling `IEnumConnections` of the same connection points does return `S_FALSE` at its end and implements `Skip` and `Clone`. VB6 follows the contract. For a VB6 class with one `Event`, the same calls through the vtable return: `Next 1` with one point: `S_OK`, fetched=1; `Next 1` at the end: `S_FALSE` (`00000001`), fetched=0; after `Reset`, `Next 2` with one point: `S_FALSE`, fetched=1; `Skip 1`: `S_OK`; `Clone`: `S_OK` and a new enumerator. No call fails.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low for twinBASIC code, which knows there is one connection point, but a client written for the contract, such as a C++ loop that runs while `Next` returns `S_OK` and treats any failure as fatal, gets an error where it expects the end of the list.

What was tried: a class with one event has exactly one connection point, so `Next 1` returning it and `Reset` followed by another `Next` both work. Reading `LastHresult` after the failing call gives 0, because the call raised its error instead of returning a success code. The same calls from a probe that passed raw pointers instead of typed variables gave the same codes.

VB6 comparison: the VB6 project is attached as `enum-connection-points-contract-vb6.zip`. VB6 cannot declare these interfaces, so it calls them through the vtable with `DispCallFunc` on raw pointers. It was built with VB6 SP6 and run, and writes `out.txt` beside the exe. Its output for this entry's calls is `Next 1, one point: hr=00000000 fetched=1`, `Next 1, at the end: hr=00000001 fetched=0`, `Next 2, one point: hr=00000001 fetched=1`, `Skip 1: hr=00000000`, `Clone: hr=00000000`, against twinBASIC's `80004005`, `80004005`, `80004001` and `80004001` for the last four.

<!-- Reproducer: bugs/enum-connection-points-contract/ (mode run, expects tbrun exit 0 and the four error codes above); verified on 995. Stated in docs/Reference/COM-Interfaces/IConnectionPoint.md, section "The enumerators" (the IEnumConnectionPoints column of the table, and the closing paragraph), and in the last example, whose comment says Next raises E_FAIL: when fixed, change both, and the sentence in the declarations section that says the enumerators of the page return one item per call whatever the count asked for. -->
