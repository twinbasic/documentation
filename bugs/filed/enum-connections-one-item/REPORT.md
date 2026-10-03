Filed as [twinbasic/twinbasic#2461](https://github.com/twinbasic/twinbasic/issues/2461).

## `IEnumConnections.Next` returns one item when asked for two with two connections present

**Describe the bug**
The enumerator that `IConnectionPoint.EnumConnections` returns for a twinBASIC class's connection point returns at most one item per `Next` call, whatever the count asked for. With two sinks connected, `Next 2` fills one `CONNECTDATA`, reports `pcFetched` as 1, and leaves the second element of the array untouched.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `enum-connections-one-item.twinproj` (attached as `enum-connections-one-item.zip`). Its one source file, `Startup.twin`, declares the project's own copies of the connection-point interfaces (`stdole` has none of them), a class `Source` with one event, and a class `Listener` with a `WithEvents` variable of type `Source`. `Sub Main` attaches two listeners to one source, takes the connection point, and asks for both connections at once:
   ```
   Dim items(0 To 1) As CONNECTDATA
   Dim connections As IEnumConnections = point.EnumConnections()
   connections.Next 2, items(0), fetched
   Debug.Print "asked for 2, two connections present: fetched=" & fetched & ", cookies " & items(0).dwCookie & " and " & items(1).dwCookie
   ```
2. Run the project in the IDE (F5).
3. See `asked for 2, two connections present: fetched=1, cookies 1 and 0`.

**Expected behavior**
`fetched` is 2 and the cookies are 1 and 2. The Windows SDK page for [IEnumConnections::Next](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nf-ocidl-ienumconnections-next) says *cConnections* is "The number of items to be retrieved. If there are fewer than the requested number of items left in the sequence, this method retrieves the remaining elements", *pcFetched* is "The number of items that were retrieved", and the return value is `S_OK` "If the method retrieves the number of items requested". A caller that passes an array and a count, as the page says it may, loses every connection after the first, and does not know it, because the call returns `S_OK`. VB6 follows the contract. With two `WithEvents` holders on one source object, `Next 2` returns `S_OK` with fetched=2 and both `CONNECTDATA` elements filled (the cookies are two different values, `4685276` and `4686156` in that run); `Next 3` returns `S_FALSE` with fetched=2; `Next 1` called three times returns the two items in turn, then `S_FALSE` with fetched=0, and `Next 2` after `Reset` returns both again.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low; the interface is mostly read one item at a time, which works, and the call at the end of the list is correct. It matters to a client that reads in blocks.

What was tried: `Next 3` with two connections returns 1 item as well. `Next 1` called repeatedly returns the items in turn, and returns `S_FALSE` with 0 items at the end. `Skip` and `Clone` work, and a null *pcFetched* is accepted for a request of 1. `IEnumConnectionPoints`, the sibling enumerator, has a different fault (see the entry about its `E_FAIL`), so the two are separate.

VB6 comparison: the VB6 project is attached as `enum-connections-one-item-vb6.zip`. VB6 cannot declare these interfaces, so it calls them through the vtable with `DispCallFunc` on raw pointers: a `Source` class with one `Event`, two `Holder` classes each with a `WithEvents` variable set to the one source, then the same calls. It was built with VB6 SP6 and run, and writes `out.txt` beside the exe. Its output for the call of this entry is `Next 2, two connections: hr=00000000 fetched=2, cookies 4685276 4686156`, against twinBASIC's `fetched=1, cookies 1 and 0`. The other calls match twinBASIC: `Skip 1` and `Clone` return `S_OK`, a null *pcFetched* is accepted for `Next 1`, and `Next 1` at the end returns `S_FALSE` with fetched=0. VB6's cookies are large values, not 1 and 2, so only the count and the two distinct non-zero cookies are the expectation, not the values 1 and 2.

<!-- Reproducer: bugs/enum-connections-one-item/ (mode run, expects tbrun exit 0 and the line above); verified on 995. Stated in docs/Reference/COM-Interfaces/IConnectionPoint.md, section "The enumerators" (the IEnumConnections column of the table, and the closing paragraph) and the sentence after the declarations that says the enumerators return one item per call: when fixed, change them. -->
